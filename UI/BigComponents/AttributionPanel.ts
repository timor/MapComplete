import Combine from "../Base/Combine";
import Translations from "../i18n/Translations";
import Attribution from "./Attribution";
import State from "../../State";
import {UIEventSource} from "../../Logic/UIEventSource";
import {FixedUiElement} from "../Base/FixedUiElement";
import * as licenses from "../../assets/generated/license_info.json"
import SmallLicense from "../../Models/smallLicense";
import {Utils} from "../../Utils";
import Link from "../Base/Link";
import {VariableUiElement} from "../Base/VariableUIElement";
import * as contributors from "../../assets/contributors.json"
import BaseUIElement from "../BaseUIElement";
import LayoutConfig from "../../Models/ThemeConfig/LayoutConfig";

/**
 * The attribution panel shown on mobile
 */
export default class AttributionPanel extends Combine {

    private static LicenseObject = AttributionPanel.GenerateLicenses();

    constructor(layoutToUse: UIEventSource<LayoutConfig>, contributions: UIEventSource<Map<string, number>>) {
        super([
            Translations.t.general.attribution.attributionContent,
            ((layoutToUse.data.maintainer ?? "") == "") ? "" : Translations.t.general.attribution.themeBy.Subs({author: layoutToUse.data.maintainer}),
            layoutToUse.data.credits,
            "<br/>",
            new Attribution(State.state.locationControl, State.state.osmConnection.userDetails, State.state.layoutToUse, State.state.leafletMap),
            "<br/>",

            new VariableUiElement(contributions.map(contributions => {
                const sorted = Array.from(contributions, ([name, value]) => ({
                    name,
                    value
                })).filter(x => x.name !== undefined && x.name !== "undefined");
                if (sorted.length === 0) {
                    return "";
                }
                sorted.sort((a, b) => b.value - a.value);
                let hiddenCount = 0;
                if (sorted.length > 10) {
                    hiddenCount = sorted.length - 10
                    sorted.splice(10, sorted.length - 10)
                }
                const links = sorted.map(kv => `<a href="https://openstreetmap.org/user/${kv.name}" target="_blank">${kv.name}</a>`)
                const contribs = links.join(", ")

                if (hiddenCount <= 0) {
                    return Translations.t.general.attribution.mapContributionsBy.Subs({
                        contributors: contribs
                    })
                } else {
                    return Translations.t.general.attribution.mapContributionsByAndHidden.Subs({
                        contributors: contribs,
                        hiddenCount: hiddenCount
                    });
                }


            })),
            "<br/>",
            AttributionPanel.CodeContributors(),
            "<h3>", Translations.t.general.attribution.iconAttribution.title.Clone().SetClass("pt-6 pb-3"), "</h3>",
            ...Utils.NoNull(Array.from(layoutToUse.data.ExtractImages()))
                .map(AttributionPanel.IconAttribution)
        ]);
        this.SetClass("flex flex-col link-underline overflow-hidden")
        this.SetStyle("max-width: calc(100vw - 5em); width: 40rem;")
    }

    private static CodeContributors(): BaseUIElement {

        const total = contributors.contributors.length;
        let filtered = [...contributors.contributors]

        filtered.splice(10, total - 10);

        let contribsStr = filtered.map(c => c.contributor).join(", ")

        if (contribsStr === "") {
            // Hmm, something went wrong loading the contributors list. Lets show nothing
            return undefined;
        }

        return Translations.t.general.attribution.codeContributionsBy.Subs({
            contributors: contribsStr,
            hiddenCount: total - 10
        });
    }

    private static IconAttribution(iconPath: string): BaseUIElement {
        if (iconPath.startsWith("http")) {
            iconPath = "." + new URL(iconPath).pathname;
        }

        const license: SmallLicense = AttributionPanel.LicenseObject[iconPath]
        if (license == undefined) {
            return undefined;
        }
        if (license.license.indexOf("trivial") >= 0) {
            return undefined;
        }

        const sources = Utils.NoNull(Utils.NoEmpty(license.sources))

        return new Combine([
            `<img src='${iconPath}' style="width: 50px; height: 50px; min-width: 50px; min-height: 50px;  margin-right: 0.5em;">`,
            new Combine([
                new FixedUiElement(license.authors.join("; ")).SetClass("font-bold"),
                new Combine([license.license,
                        sources.length > 0 ? " - " : "",
                        ...sources.map(lnk => {
                            let sourceLinkContent = lnk;
                            try {
                                sourceLinkContent = new URL(lnk).hostname
                            } catch {
                                console.error("Not a valid URL:", lnk)
                            }
                            return new Link(sourceLinkContent, lnk, true);
                        })
                    ]
                ).SetClass("block m-2")
                    
            ]).SetClass("flex flex-col").SetStyle("width: calc(100% - 50px - 0.5em); min-width: 12rem;")
        ]).SetClass("flex flex-wrap border-b border-gray-300 m-2 border-box")
    }

    private static GenerateLicenses() {
        const allLicenses = {}
        for (const key in licenses) {
            const license: SmallLicense = licenses[key];
            allLicenses[license.path] = license
        }
        return allLicenses;
    }
}