import {UIEventSource} from "../../Logic/UIEventSource";
import LayerConfig from "../../Customizations/JSON/LayerConfig";
import EditableTagRendering from "./EditableTagRendering";
import QuestionBox from "./QuestionBox";
import Combine from "../Base/Combine";
import TagRenderingAnswer from "./TagRenderingAnswer";
import State from "../../State";
import TagRenderingConfig from "../../Customizations/JSON/TagRenderingConfig";
import ScrollableFullScreen from "../Base/ScrollableFullScreen";
import {Tag} from "../../Logic/Tags/Tag";
import Constants from "../../Models/Constants";
import SharedTagRenderings from "../../Customizations/SharedTagRenderings";
import BaseUIElement from "../BaseUIElement";
import {VariableUiElement} from "../Base/VariableUIElement";
import DeleteWizard from "./DeleteWizard";
import {Utils} from "../../Utils";
import Title from "../Base/Title";
import Translations from "../i18n/Translations";
import SplitRoadWizard from "./SplitRoadWizard";

export default class FeatureInfoBox extends ScrollableFullScreen {

    public constructor(
        tags: UIEventSource<any>,
        layerConfig: LayerConfig,
    ) {
        super(() => FeatureInfoBox.GenerateTitleBar(tags, layerConfig),
            () => FeatureInfoBox.GenerateContent(tags, layerConfig),
            undefined);

        if (layerConfig === undefined) {
            throw "Undefined layerconfig";
        }

    }

    private static GenerateTitleBar(tags: UIEventSource<any>,
                                    layerConfig: LayerConfig): BaseUIElement {
        const title = new TagRenderingAnswer(tags, layerConfig.title ?? new TagRenderingConfig("POI", undefined))
            .SetClass("break-words font-bold sm:p-0.5 md:p-1 sm:p-1.5 md:p-2");
        const titleIcons = new Combine(
            layerConfig.titleIcons.map(icon => new TagRenderingAnswer(tags, icon,
                "block w-8 h-8 align-baseline box-content sm:p-0.5", "width: 2rem;")
            ))
            .SetClass("flex flex-row flex-wrap pt-0.5 sm:pt-1 items-center mr-2")

        return new Combine([
            new Combine([title, titleIcons]).SetClass("flex flex-col sm:flex-row flex-grow justify-between")
        ])
    }

    private static getQuestionBox(tags: UIEventSource<any>, layerConfig: LayerConfig, tagRenderings: TagRenderingConfig[]) {
        let questionBox: BaseUIElement = undefined;

        // fs-userbadge = false as GET parameter means view-only mode, so a Questionbox doesn't have to be generated
        if (State.state.featureSwitchUserbadge.data) {
            questionBox = new QuestionBox(tags, tagRenderings, layerConfig.units);
        }

        let questionBoxIsUsed = false;
        const renderings: BaseUIElement[] = tagRenderings.map(tr => {
            if (tr.question === null) {
                // This is the question box!
                questionBoxIsUsed = true;
                return questionBox;
            }
            return new EditableTagRendering(tags, tr, layerConfig.units);
        });
        
        let editElements : BaseUIElement[] = []
        if (!questionBoxIsUsed) {
            editElements.push(questionBox);
        }
        return renderings;
    }

    private static GenerateContent(tags: UIEventSource<any>,
                                   layerConfig: LayerConfig): BaseUIElement {

        const tagRenderings = layerConfig.tagRenderings;

        // Some questions are general, some must be asked seperately on the left side of the road and on the right side of the road
        const leftRightDistinctions: string[] = layerConfig.leftRightDistinctions;
        const generalTagRenderings = tagRenderings.filter(tagRendering => !(tagRendering.shouldSplit(leftRightDistinctions)))
        const splittedTagRenderings = tagRenderings.filter(tagRendering => tagRendering.shouldSplit(leftRightDistinctions))

        const leftTagRenderings = splittedTagRenderings.map(tagRendering => tagRendering.makeLeftRight(leftRightDistinctions,"left"))
        const rightTagRenderings = splittedTagRenderings.map(tagRendering => tagRendering.makeLeftRight(leftRightDistinctions, "right"))

        const leftRightDistinct = leftTagRenderings.length != 0 || rightTagRenderings.length != 0;

        function getSideVersionOfKey(key, side: ("left" | "right" | "both")) {
            // e.g. for cycleway:surface, this should return cycleway:left:surface
            const splittedKeys = key.split(":")
            splittedKeys.splice(1, 0, side)
            return splittedKeys.join(":")
        }

        /**
         * Adds for the keys specified in leftRightDistinctions a left and a right version if not yet specified
         * e.g. {"sidewalk": "yes"} -> {"sidewalk:left": "yes", "sidewalk:right": "yes"}
         * @param props Json containing all properties
         */
        function addLeftRightTags(props: any) {
            const newProps = {...props};
            for (var prop in props) {
                const value = props[prop];
                const splittedKeys = prop.split(":")
                if (leftRightDistinctions.includes(splittedKeys[0])) {
                    if (splittedKeys.length >= 2 && splittedKeys[1] in ["left", "right"]) {
                        // Left and right is already specified here, so skip
                        continue;
                    } else if (splittedKeys.length >= 2 && splittedKeys[1] === "both") {
                        // Both is specified, so split this in left and right
                        const temp = [...splittedKeys];

                        temp[1] = "left"
                        const leftKey = temp.join(":")

                        temp[1] = "right"
                        const rightKey = temp.join(":")

                        newProps[leftKey] = value;
                        newProps[rightKey] = value;

                        continue;
                    } else {
                        // No direction specifier already added, so we kan add our own (if left and right isn't specified yet)
                        const leftKey = getSideVersionOfKey(prop, "left")
                        const rightKey = getSideVersionOfKey(prop, "right")

                        if (!(leftKey in props)){
                            newProps[leftKey] = value;
                        }

                        if (!(rightKey in props)){
                            newProps[rightKey] = value;
                        }

                    }
                }
            }
            return newProps;
        }

        // Answers must be splitted to left and right, if e.g. only the :both attribute exists
        const expandedTags = tags.map(tag => addLeftRightTags(tag))

        function getMapAndQuestions(tags: UIEventSource<any>, layerConfig: LayerConfig, tagRenderings, options? : {left? : boolean, right? : boolean}){

            const defaults = {left: false, right: false};
            options = Utils.setDefaults(options, defaults);


            // Should be either left, right or none, not both -> Maybe this should be an enum?
            console.assert(!(options.left && options.right));

            const renderings = FeatureInfoBox.getQuestionBox(tags, layerConfig, tagRenderings);

            function getMinimap(left = false, right = false) {
                let mapType = left? "minimap_left" : right? "minimap_right" : "minimap";
                return new TagRenderingAnswer(tags, SharedTagRenderings.SharedTagRendering.get(mapType))
            }

            const hasMinimap = layerConfig.tagRenderings.some(tr => tr.hasMinimap())
            if (!hasMinimap) {
                renderings.push(getMinimap(options.left, options.right));
            }

            return renderings;
        }

        let renderings;
        if (!leftRightDistinct) {
            renderings = getMapAndQuestions(tags, layerConfig, tagRenderings);
        } else {
            const generalTitle = new Title(Translations.t.roadside.general.Clone());
            const generalMapQuestions = getMapAndQuestions(tags, layerConfig, generalTagRenderings);
            generalMapQuestions.unshift(generalTitle)

            const leftTitle = new Title(Translations.t.roadside.left.Clone())
            const leftMapQuestions = getMapAndQuestions(expandedTags, layerConfig, leftTagRenderings, {left: true});
            leftMapQuestions.unshift(leftTitle)

            const rightTitle = new Title(Translations.t.roadside.right.Clone())
            const rightMapQuestions = getMapAndQuestions(expandedTags, layerConfig, rightTagRenderings, {right: true});
            rightMapQuestions.unshift(rightTitle)

            renderings = generalMapQuestions.concat(leftMapQuestions, rightMapQuestions)
        }


        const editElements : BaseUIElement[] = []
        if (layerConfig.deletion) {
            editElements.push(
                new VariableUiElement(tags.map(tags => tags.id).map(id =>
                    new DeleteWizard(
                        id,
                        layerConfig.deletion
                    ))
                ))
        }

        if (layerConfig.allowSplit) {
            editElements.push(
                new VariableUiElement(tags.map(tags => tags.id).map(id =>
                    new SplitRoadWizard(id))
                ))
        }


        const hasMinimap = layerConfig.tagRenderings.some(tr => tr.hasMinimap())
        if (!hasMinimap) {
            renderings.push(new TagRenderingAnswer(tags, SharedTagRenderings.SharedTagRendering.get("minimap")))
        }

        editElements.push(
            new VariableUiElement(
                State.state.osmConnection.userDetails
                    .map(ud => ud.csCount)
                    .map(csCount => {
                        if (csCount <= Constants.userJourney.historyLinkVisible
                            && State.state.featureSwitchIsDebugging.data == false
                            && State.state.featureSwitchIsTesting.data === false) {
                            return undefined
                        }

                        return new TagRenderingAnswer(tags, SharedTagRenderings.SharedTagRendering.get("last_edit"));

                    }, [State.state.featureSwitchIsDebugging, State.state.featureSwitchIsTesting])
            )
        )


        editElements.push(
            new VariableUiElement(
                State.state.featureSwitchIsDebugging.map(isDebugging => {
                    if (isDebugging) {
                        const config: TagRenderingConfig = new TagRenderingConfig({render: "{all_tags()}"}, new Tag("id", ""), "");
                        return new TagRenderingAnswer(tags, config)
                    }
                })
            )
        )
        
        const editors = new VariableUiElement(State.state.featureSwitchUserbadge.map(
            userbadge => {
                if(!userbadge){
                    return undefined
                }
                return new Combine(editElements)
            }
        ))
        renderings.push(editors)

        return new Combine(renderings).SetClass("block")

    }

}
