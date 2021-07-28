import {TagsFilter} from "./TagsFilter";

export default class ComparingTag implements TagsFilter {
    private readonly _key: string;
    private readonly _predicate: (value: string) => boolean;
    private readonly _representation: string;
    
    constructor(key: string, predicate : (value:string | undefined) => boolean, representation: string = "") {
        this._key = key;
        this._predicate = predicate;
        this._representation = representation;
    }
    
    asChange(properties: any): { k: string; v: string }[] {
        throw "A comparable tag can not be used to be uploaded to OSM"
    }

    asHumanString(linkToWiki: boolean, shorten: boolean, properties: any) {
        return this._key+this._representation
    }

    asOverpass(): string[] {
        throw "A comparable tag can not be used as overpass filter"
    }

    isEquivalent(other: TagsFilter): boolean {
        return other === this;
    }

    isUsableAsAnswer(): boolean {
        return false;
    }

    matchesProperties(properties: any): boolean {
        return this._predicate(properties[this._key]);
    }

    usedKeys(): string[] {
        return [this._key];
    }

    getLeftRightFilter(leftRightDistinctions: string[], side: "left" | "right") {
        const tags = this._key.split(":")
        if(leftRightDistinctions.includes(tags[0]) &&
            !(tags[1] === "left" || tags[1] === "right")) {
            // append the direction after the first element
            tags.splice(1, 0, side)
        }
        const newKey = tags.join(":");
        return `${newKey}${this._representation}`
    }
}