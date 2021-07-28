import {Tag} from "./Tag";
import {TagsFilter} from "./TagsFilter";
import {And} from "./And";
import {Utils} from "../../Utils";

export class TagUtils {
    static ApplyTemplate(template: string, tags: any): string {
        for (const k in tags) {
            while (template.indexOf("{" + k + "}") >= 0) {
                const escaped = tags[k].replace(/</g, '&lt;').replace(/>/g, '&gt;');
                template = template.replace("{" + k + "}", escaped);
            }
        }
        return template;
    }

    static KVtoProperties(tags: Tag[]): any {
        const properties = {};
        for (const tag of tags) {
            properties[tag.key] = tag.value
        }
        return properties;
    }   
    
    private static getSideVersionOfKey(key, side: ("left" | "right" | "both")) {
        // e.g. for cycleway:surface, this should return cycleway:left:surface
        const splittedKeys = key.split(":")
        splittedKeys.splice(1, 0, side)
        return splittedKeys.join(":")
    }

    /**
     * Adds for the keys specified in leftRightDistinctions a left and a right version if not yet specified
     * e.g. {"sidewalk": "yes"} -> {"sidewalk:left": "yes", "sidewalk:right": "yes"} (if leftRightDistinctions contains 'sidewalk')
     * @param props Json containing all properties
     */
    public static addLeftRightTags(leftRightDistinctions: string[], props: any) {
        const newProps = {...props};
        for (var prop in props) {
            const value = props[prop];
            const splittedKeys = prop.split(":")
            if (leftRightDistinctions.includes(splittedKeys[0])) {
                if (splittedKeys.length >= 2 && splittedKeys[1] in ["left", "right"]) {
                    // Left and right is already specified here, so skip
                    
                } else if (splittedKeys.length >= 2 && splittedKeys[1] === "both") {
                    // Both is specified, so split this in left and right
                    const temp = [...splittedKeys];

                    temp[1] = "left"
                    const leftKey = temp.join(":")

                    temp[1] = "right"
                    const rightKey = temp.join(":")

                    newProps[leftKey] = value;
                    newProps[rightKey] = value;

                } else {
                    // No direction specifier already added, so we kan add our own (if left and right isn't specified yet)
                    const leftKey =TagUtils. getSideVersionOfKey(prop, "left")
                    const rightKey =TagUtils.  getSideVersionOfKey(prop, "right")

                    if (!(leftKey in props)) {
                        newProps[leftKey] = value;
                    }

                    if (!(rightKey in props)) {
                        newProps[rightKey] = value;
                    }

                }
            }
        }
        return newProps;
    }

    /**
     * Given two hashes of {key --> values[]}, makes sure that every neededTag is present in availableTags
     */
    static AllKeysAreContained(availableTags: any, neededTags: any) {
        for (const neededKey in neededTags) {
            const availableValues: string[] = availableTags[neededKey]
            if (availableValues === undefined) {
                return false;
            }
            const neededValues: string[] = neededTags[neededKey];
            for (const neededValue of neededValues) {
                if (availableValues.indexOf(neededValue) < 0) {
                    return false;
                }
            }
        }
        return true;
    }

    /***
     * Creates a hash {key --> [values]}, with all the values present in the tagsfilter
     *
     * @param tagsFilters
     * @constructor
     */
    static SplitKeys(tagsFilters: TagsFilter[]) {
        const keyValues = {} // Map string -> string[]
        tagsFilters = [...tagsFilters] // copy all
        while (tagsFilters.length > 0) {
            // Queue
            const tagsFilter = tagsFilters.shift();

            if (tagsFilter === undefined) {
                continue;
            }

            if (tagsFilter instanceof And) {
                tagsFilters.push(...tagsFilter.and);
                continue;
            }

            if (tagsFilter instanceof Tag) {
                if (keyValues[tagsFilter.key] === undefined) {
                    keyValues[tagsFilter.key] = [];
                }
                keyValues[tagsFilter.key].push(...tagsFilter.value.split(";"));
                continue;
            }

            console.error("Invalid type to flatten the multiAnswer", tagsFilter);
            throw "Invalid type to FlattenMultiAnswer"
        }
        return keyValues;
    }

    /**
     * Given multiple tagsfilters which can be used as answer, will take the tags with the same keys together as set.
     * E.g:
     *
     * FlattenMultiAnswer([and: [ "x=a", "y=0;1"], and: ["x=b", "y=2"], and: ["x=", "y=3"]])
     * will result in
     * ["x=a;b", "y=0;1;2;3"]
     *
     * @param tagsFilters
     * @constructor
     */
    static FlattenMultiAnswer(tagsFilters: TagsFilter[]): And {
        if (tagsFilters === undefined) {
            return new And([]);
        }

        let keyValues = TagUtils.SplitKeys(tagsFilters);
        const and: TagsFilter[] = []
        for (const key in keyValues) {
            and.push(new Tag(key, Utils.Dedup(keyValues[key]).join(";")));
        }
        return new And(and);
    }

    static MatchesMultiAnswer(tag: TagsFilter, tags: any): boolean {
        const splitted = TagUtils.SplitKeys([tag]);
        for (const splitKey in splitted) {
            const neededValues = splitted[splitKey];
            if (tags[splitKey] === undefined) {
                return false;
            }

            const actualValue = tags[splitKey].split(";");
            for (const neededValue of neededValues) {
                if (actualValue.indexOf(neededValue) < 0) {
                    return false;
                }
            }
        }
        return true;
    }

    getLeftRightFilter(leftRightDistinctions, side: "left" | "right") {
        return {"TODO": ":("}
    }
}