import {TagRenderingConfigJson} from "./TagRenderingConfigJson";
import Translations from "../../UI/i18n/Translations";
import {FromJSON} from "./FromJSON";
import ValidatedTextField from "../../UI/Input/ValidatedTextField";
import {Translation} from "../../UI/i18n/Translation";
import {Utils} from "../../Utils";
import {TagUtils} from "../../Logic/Tags/TagUtils";
import {And} from "../../Logic/Tags/And";
import {TagsFilter} from "../../Logic/Tags/TagsFilter";
import {SubstitutedTranslation} from "../../UI/SubstitutedTranslation";


/***
 * The parsed version of TagRenderingConfigJSON
 * Identical data, but with some methods and validation
 */
export default class TagRenderingConfig {

    readonly render?: Translation;
    readonly question?: Translation;
    readonly condition?: TagsFilter;

    readonly configuration_warnings: string[] = []

    readonly freeform?: {
        readonly key: string,
        readonly type: string,
        readonly addExtraTags: TagsFilter[];
        readonly inline: boolean,
        readonly default?: string
    };

    readonly multiAnswer: boolean;

    readonly mappings?: {
        readonly if: TagsFilter,
        readonly ifnot?: TagsFilter,
        readonly then: Translation
        readonly hideInAnswer: boolean | TagsFilter
    }[]
    readonly roaming: boolean;

    constructor(json: string | TagRenderingConfigJson, conditionIfRoaming: TagsFilter, context?: string) {

        if (json === "questions") {
            // Very special value
            this.render = null;
            this.question = null;
            this.condition = null;
        }

        if (json === undefined) {
            throw "Initing a TagRenderingConfig with undefined in " + context;
        }
        if (typeof json === "string") {
            this.render = Translations.T(json, context + ".render");
            this.multiAnswer = false;
            return;
        }

        this.render = Translations.T(json.render, context + ".render");
        this.question = Translations.T(json.question, context + ".question");
        this.roaming = json.roaming ?? false;
        const condition = FromJSON.Tag(json.condition ?? {"and": []}, `${context}.condition`);
        if (this.roaming && conditionIfRoaming !== undefined) {
            this.condition = new And([condition, conditionIfRoaming]);
        } else {
            this.condition = condition;
        }
        if (json.freeform) {


            this.freeform = {
                key: json.freeform.key,
                type: json.freeform.type ?? "string",
                addExtraTags: json.freeform.addExtraTags?.map((tg, i) =>
                    FromJSON.Tag(tg, `${context}.extratag[${i}]`)) ?? [],
                inline: json.freeform.inline ?? false,
                default: json.freeform.default


            }
            if (json.freeform["extraTags"] !== undefined) {
                throw `Freeform.extraTags is defined. This should probably be 'freeform.addExtraTag' (at ${context})`
            }
            if (this.freeform.key === undefined || this.freeform.key === "") {
                throw `Freeform.key is undefined or the empty string - this is not allowed; either fill out something or remove the freeform block alltogether. Error in ${context}`
            }


            if (ValidatedTextField.AllTypes[this.freeform.type] === undefined) {
                const knownKeys = ValidatedTextField.tpList.map(tp => tp.name).join(", ");
                throw `Freeform.key ${this.freeform.key} is an invalid type. Known keys are ${knownKeys}`
            }
            if (this.freeform.addExtraTags) {
                const usedKeys = new And(this.freeform.addExtraTags).usedKeys();
                if (usedKeys.indexOf(this.freeform.key) >= 0) {
                    throw `The freeform key ${this.freeform.key} will be overwritten by one of the extra tags, as they use the same key too. This is in ${context}`;
                }
            }
        }

        this.multiAnswer = json.multiAnswer ?? false
        if (json.mappings) {

            if (!Array.isArray(json.mappings)) {
                throw "Tagrendering has a 'mappings'-object, but expected a list (" + context + ")"
            }

            this.mappings = json.mappings.map((mapping , i) => {


                if (mapping.then === undefined) {
                    throw `${context}.mapping[${i}]: Invalid mapping: if without body`
                }
                if (mapping.ifnot !== undefined && !this.multiAnswer) {
                    throw `${context}.mapping[${i}]: Invalid mapping: ifnot defined, but the tagrendering is not a multianswer`
                }

                if (mapping.if === undefined) {
                    throw `${context}.mapping[${i}]: Invalid mapping: "if" is not defined, but the tagrendering is not a multianswer`
                }
                if (typeof mapping.if !== "string" && mapping.if["length"] !== undefined) {
                    throw `${context}.mapping[${i}]: Invalid mapping: "if" is defined as an array. Use {"and": <your conditions>} or {"or": <your conditions>} instead`
                }


                let hideInAnswer: boolean | TagsFilter = false;
                if (typeof mapping.hideInAnswer === "boolean") {
                    hideInAnswer = mapping.hideInAnswer;
                } else if (mapping.hideInAnswer !== undefined) {
                    hideInAnswer = FromJSON.Tag(mapping.hideInAnswer, `${context}.mapping[${i}].hideInAnswer`);
                }
                const mappingContext = `${context}.mapping[${i}]`
                const mp = {
                    if: FromJSON.Tag(mapping.if, `${mappingContext}.if`),
                    ifnot: (mapping.ifnot !== undefined ? FromJSON.Tag(mapping.ifnot, `${mappingContext}.ifnot`) : undefined),
                    then: Translations.T(mapping.then, `{mappingContext}.then`),
                    hideInAnswer: hideInAnswer
                };
                if (this.question) {
                    if (hideInAnswer !== true && mp.if !== undefined && !mp.if.isUsableAsAnswer()) {
                        throw `${context}.mapping[${i}].if: This value cannot be used to answer a question, probably because it contains a regex or an OR. Either change it or set 'hideInAnswer'`
                    }

                    if (hideInAnswer !== true && !(mp.ifnot?.isUsableAsAnswer() ?? true)) {
                        throw `${context}.mapping[${i}].ifnot: This value cannot be used to answer a question, probably because it contains a regex or an OR. Either change it or set 'hideInAnswer'`
                    }
                }

                return mp;
            });
        }

        if (this.question && this.freeform?.key === undefined && this.mappings === undefined) {
            throw `${context}: A question is defined, but no mappings nor freeform (key) are. The question is ${this.question.txt} at ${context}`
        }

        if (this.freeform && this.render === undefined) {
            throw `${context}: Detected a freeform key without rendering... Key: ${this.freeform.key} in ${context}`
        }

        if (this.render && this.question && this.freeform === undefined) {
            throw `${context}: Detected a tagrendering which takes input without freeform key in ${context}; the question is ${this.question.txt}`
        }

        if (!json.multiAnswer && this.mappings !== undefined && this.question !== undefined) {
            let keys = []
            for (let i = 0; i < this.mappings.length; i++) {
                const mapping = this.mappings[i];
                if (mapping.if === undefined) {
                    throw `${context}.mappings[${i}].if is undefined`
                }
                keys.push(...mapping.if.usedKeys())
            }
            keys = Utils.Dedup(keys)
            for (let i = 0; i < this.mappings.length; i++) {
                const mapping = this.mappings[i];
                if (mapping.hideInAnswer) {
                    continue
                }

                const usedKeys = mapping.if.usedKeys();
                for (const expectedKey of keys) {
                    if (usedKeys.indexOf(expectedKey) < 0) {
                        const msg = `${context}.mappings[${i}]: This mapping only defines values for ${usedKeys.join(', ')}, but it should also give a value for ${expectedKey}`
                        this.configuration_warnings.push(msg)
                    }
                }
            }
        }

        if (this.question !== undefined && json.multiAnswer) {
            if ((this.mappings?.length ?? 0) === 0) {
                throw `${context} MultiAnswer is set, but no mappings are defined`
            }

            let allKeys = [];
            let allHaveIfNot = true;
            for (const mapping of this.mappings) {
                if (mapping.hideInAnswer) {
                    continue;
                }
                if (mapping.ifnot === undefined) {
                    allHaveIfNot = false;
                }
                allKeys = allKeys.concat(mapping.if.usedKeys());
            }
            allKeys = Utils.Dedup(allKeys);
            if (allKeys.length > 1 && !allHaveIfNot) {
                throw `${context}: A multi-answer is defined, which generates values over multiple keys. Please define ifnot-tags too on every mapping`
            }

        }
    }


    /**
     * Returns true if it is known or not shown, false if the question should be asked
     * @constructor
     */
    public IsKnown(tags: any): boolean {
        if (this.condition &&
            !this.condition.matchesProperties(tags)) {
            // Filtered away by the condition
            return true;
        }
        if (this.multiAnswer) {
            for (const m of this.mappings ?? []) {
                if (TagUtils.MatchesMultiAnswer(m.if, tags)) {
                    return true;
                }
            }

            const free = this.freeform?.key
            if (free !== undefined) {
                return tags[free] !== undefined
            }
            return false

        }

        if (this.GetRenderValue(tags) !== undefined) {
            // This value is known and can be rendered
            return true;
        }

        return false;
    }

    public IsQuestionBoxElement(): boolean {
        return this.question === null && this.condition === null;
    }

    /**
     * Gets all the render values. Will return multiple render values if 'multianswer' is enabled.
     * The result will equal [GetRenderValue] if not 'multiAnswer'
     * @param tags
     * @constructor
     */
    public GetRenderValues(tags: any): Translation[] {
        if (!this.multiAnswer) {
            return [this.GetRenderValue(tags)]
        }

        // A flag to check that the freeform key isn't matched multiple times 
        // If it is undefined, it is "used" already, or at least we don't have to check for it anymore
        let freeformKeyUsed = this.freeform?.key === undefined;
        // We run over all the mappings first, to check if the mapping matches
        const applicableMappings: Translation[] = Utils.NoNull((this.mappings ?? [])?.map(mapping => {
            if (mapping.if === undefined) {
                return mapping.then;
            }
            if (TagUtils.MatchesMultiAnswer(mapping.if, tags)) {
                if (!freeformKeyUsed) {
                    if (mapping.if.usedKeys().indexOf(this.freeform.key) >= 0) {
                        // This mapping matches the freeform key - we mark the freeform key to be ignored!
                        freeformKeyUsed = true;
                    }
                }
                return mapping.then;
            }
            return undefined;
        }))


        if (!freeformKeyUsed
            && tags[this.freeform.key] !== undefined) {
            applicableMappings.push(this.render)
        }
        return applicableMappings
    }

    /**
     * Gets the correct rendering value (or undefined if not known)
     * Not compatible with multiAnswer - use GetRenderValueS instead in that case
     * @constructor
     */
    public GetRenderValue(tags: any): Translation {
        if (this.mappings !== undefined && !this.multiAnswer) {
            for (const mapping of this.mappings) {
                if (mapping.if === undefined) {
                    return mapping.then;
                }
                if (mapping.if.matchesProperties(tags)) {
                    return mapping.then;
                }
            }
        }


        if (this.freeform?.key === undefined) {
            return this.render;
        }

        if (tags[this.freeform.key] !== undefined) {
            return this.render;
        }
        return undefined;
    }

    public ExtractImages(isIcon: boolean): Set<string> {

        const usedIcons = new Set<string>()
        this.render?.ExtractImages(isIcon)?.forEach(usedIcons.add, usedIcons)

        for (const mapping of this.mappings ?? []) {
            mapping.then.ExtractImages(isIcon).forEach(usedIcons.add, usedIcons)
        }

        return usedIcons;
    }

    /**
     * Returns true if this tag rendering has a minimap in some language.
     * Note: this might be hidden by conditions
     */
    public hasMinimap(): boolean {
        const translations : Translation[]= Utils.NoNull([this.render, ...(this.mappings ?? []).map(m => m.then)]);
        for (const translation of translations) {
            for (const key in translation.translations) {
                if(!translation.translations.hasOwnProperty(key)){
                    continue
                }
                const template = translation.translations[key]
                const parts = SubstitutedTranslation.ExtractSpecialComponents(template)
                const hasMiniMap = parts.filter(part =>part.special !== undefined ).some(special => special.special.func.funcName === "minimap")
                if(hasMiniMap){
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Returns a set of all keys on which this TagRendering depends
     */
    public getKeyDependencies(): Set<string> {

        const allKeyDependencies = []

        /**
         * Returns a set of all keys on which the renderstrings depend
         */
        function getTranslationDependencies(render) {
            let allKeyDependencies = []
            const findKeysInCurlyBraces = /{([^}]+)}/g
            // iterate over all languages
            if (render === undefined || render.translations === undefined) return [];
            for (let translation of render.translations) {
                const renderStr = render.translations[translation]
                const matches = renderStr.match(findKeysInCurlyBraces);
                const keyDependencies = matches.map(match => match.slice(1, -1)); // remove the curly brackets
                allKeyDependencies = allKeyDependencies.concat(keyDependencies); // TODO? Special keys e.g. image_carousel()
            }
            return allKeyDependencies;
        }

        function getTagsFilterDependencies(tagsFilter: TagsFilter): string[] {
            if (tagsFilter === undefined) return [];
            return tagsFilter.usedKeys();
        }

        function getMappingsDependencies(mappings){
            if (mappings === undefined) return [];

            const allDependencies: string[] = [];
            for (let mapping of mappings){
                allDependencies.push(...getTagsFilterDependencies(mapping.if));
                allDependencies.push(...getTagsFilterDependencies(mapping.ifnot));
                allDependencies.push(...getTranslationDependencies(mapping.then));
                if (mapping.hideInAnswer instanceof TagsFilter) allDependencies.push(...getTagsFilterDependencies(mapping.then))
            }

            return allDependencies;
        }

        allKeyDependencies.push(...getTranslationDependencies(this.render));
        allKeyDependencies.push(...getTagsFilterDependencies(this.condition));
        allKeyDependencies.push(...getMappingsDependencies(this.mappings));

        return new Set([...allKeyDependencies]);
    }

    /**
     * Returns true if this tag rendering must be added seperately on the right side of the road and on the left side of the road
     * (and false if it's a general question of which the answer applies for both sides of the road)
     * @param leftRightDistinctions The osm keys on which to seperate between a left question and a right question, can be specified in the layerconfig
     */
    public shouldSplit(leftRightDistinctions): boolean {
        if (leftRightDistinctions === undefined) return false;
        const keysDependencies = this.getKeyDependencies();
        return leftRightDistinctions.some(splitKey => keysDependencies.has(splitKey.split(":")[0])); // TODO: momenteel moeten de keys exact hetzelfde zijn, mss moet er gewoon gecheckt worden of het linkerdeel voor de eerste dubbelpunt matcht?
    }

    public makeLeftRight(leftRightDistinctions, side: ("left" | "right")) {
        // JSON opbouwen en dan tagrenderingsconfig van json
        // Returns a new tagrenderin
        // return new TagRenderingConfig()
        function getLeftRightTagsFilter(tagsFilter: TagsFilter) {
            return tagsFilter.getLeftRightFilter(leftRightDistinctions, side)
        }

        function getLeftRightMappings(mappings) {
            if (mappings === undefined) return undefined;
            const mappingsJson = []
            for (let mapping of mappings){
                const mappingJson = {}

                mappingJson["if"] = getLeftRight(mapping.if);
                mappingJson["ifnot"] = getLeftRight(mapping.ifnot);
                mappingJson["then"] = getLeftRight(mapping.then);
                if (mapping.hideInAnswer instanceof TagsFilter) {
                    mappingJson["hideInAnswer"] = getLeftRight(mapping.hideInAnswer)
                } else {
                    mappingsJson["hideInAnswer"] = mapping.hideInAnswer;
                }

                mappingsJson.push(mappingJson)
            }
            return mappingsJson
        }

        function getLeftRightFreeform(freeform) {
            if (freeform === undefined) return undefined;
            const freeformJson = {};
            freeformJson["key"] = freeform.key; // TODO: Should this be different between left and right?
            freeformJson["type"] = freeform.type;
            freeformJson["addExtraTags"] = getLeftRight(freeform.addExtraTags);
            freeformJson["inline"] = freeform.inline;
            freeformJson["default"] = freeform.default;
            return freeformJson
        }

        function getLeftRightTranslation(translation: Translation) {
            // TODO: Make left right
            return translation.translations;
        }

        function getLeftRight(object) {
            if (object instanceof TagsFilter){
                return getLeftRightTagsFilter(object);
            } else if (object instanceof Translation) {
                return getLeftRightTranslation(object);
            } else if (object instanceof Array) {
                return object.map(el => getLeftRight(el))
            } else if (object === undefined) {
                return undefined;
            } else {
                console.warn("Left right of unknown object: ", object)
                return object;
            }

        }

        const configJson = {};

        configJson["render"] = getLeftRight(this.render)
        configJson["question"] = getLeftRight(this.question)
        configJson["condition"] = getLeftRight(this.condition)
        configJson["configuration_warnings"] = this.configuration_warnings;
        configJson["freeform"] = getLeftRightFreeform(this.freeform);
        configJson["multiAnswer"] = this.multiAnswer

        const newMappings = getLeftRightMappings(this.mappings);
        if (newMappings !== undefined) configJson["mappings"] = newMappings;

        configJson["roaming"] = this.roaming;

        // conditionIfRoaming is already part of condition
        return new TagRenderingConfig(configJson, undefined, "spltting left/right");
    }
}