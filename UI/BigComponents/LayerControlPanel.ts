import State from "../../State";
import BackgroundSelector from "./BackgroundSelector";
import LayerSelection from "./LayerSelection";
import Combine from "../Base/Combine";
import ScrollableFullScreen from "../Base/ScrollableFullScreen";
import Translations from "../i18n/Translations";
import {UIEventSource} from "../../Logic/UIEventSource";
import BaseUIElement from "../BaseUIElement";
import Toggle from "../Input/Toggle";
import {ExportDataButton} from "./ExportDataButton";

export default class LayerControlPanel extends ScrollableFullScreen {

    constructor(isShown: UIEventSource<boolean>) {
        super(LayerControlPanel.GenTitle, LayerControlPanel.GeneratePanel, "layers", isShown);
    }

    private static GenTitle(): BaseUIElement {
        return Translations.t.general.layerSelection.title.Clone().SetClass("text-2xl break-words font-bold p-2")
    }

    private static GeneratePanel(): BaseUIElement {
        const elements: BaseUIElement[] = []

        if (State.state.layoutToUse.data.enableBackgroundLayerSelection) {
            const backgroundSelector = new BackgroundSelector();
            backgroundSelector.SetStyle("margin:1em");
            backgroundSelector.onClick(() => {
            });
            elements.push(backgroundSelector)
        }

        elements.push(new Toggle(
            new LayerSelection(State.state.filteredLayers),
            undefined,
            State.state.filteredLayers.map(layers => layers.length > 1)
        ))

        elements.push(new Toggle(
            new ExportDataButton(),
            undefined,
            State.state.featureSwitchEnableExport
        ))

        return new Combine(elements).SetClass("flex flex-col")
    }

}