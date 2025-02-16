import * as questions from "../assets/tagRenderings/questions.json";
import * as icons from "../assets/tagRenderings/icons.json";
import {Utils} from "../Utils";
import TagRenderingConfig from "../Models/ThemeConfig/TagRenderingConfig";

export default class SharedTagRenderings {

    public static SharedTagRendering : Map<string, TagRenderingConfig> = SharedTagRenderings.generatedSharedFields();
    public static SharedIcons : Map<string, TagRenderingConfig> = SharedTagRenderings.generatedSharedFields(true);

    private static generatedSharedFields(iconsOnly = false) : Map<string, TagRenderingConfig>{
        const dict = new Map<string, TagRenderingConfig>();

        function add(key, store) {
            try {
                dict.set(key, new TagRenderingConfig(store[key], undefined, `SharedTagRenderings.${key}`))
            } catch (e) {
                if(!Utils.runningFromConsole){
                    console.error("BUG: could not parse", key, " from questions.json or icons.json - this error happened during the build step of the SharedTagRenderings", e)

                }
            }
        }

        if (!iconsOnly) {
            for (const key in questions) {
                add(key, questions);
            }
        }
        for (const key in icons) {
            add(key, icons);
        }

        return dict;
    }

}
