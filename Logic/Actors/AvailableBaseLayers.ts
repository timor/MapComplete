import * as editorlayerindex from "../../assets/editor-layer-index.json"
import BaseLayer from "../../Models/BaseLayer";
import * as L from "leaflet";
import {TileLayer} from "leaflet";
import * as X from "leaflet-providers";
import {UIEventSource} from "../UIEventSource";
import {GeoOperations} from "../GeoOperations";
import {Utils} from "../../Utils";
import Loc from "../../Models/Loc";

/**
 * Calculates which layers are available at the current location
 * Changes the basemap
 */
export default class AvailableBaseLayers {


    public static osmCarto: BaseLayer =
        {
            id: "osm",
            name: "OpenStreetMap",
            layer: () => AvailableBaseLayers.CreateBackgroundLayer("osm", "OpenStreetMap",
                "https://tile.openstreetmap.org/{z}/{x}/{y}.png", "OpenStreetMap", "https://openStreetMap.org/copyright",
                19,
                false, false),
            feature: null,
            max_zoom: 19,
            min_zoom: 0,
            isBest: false, // This is a lie! Of course OSM is the best map! (But not in this context)
            category: "osmbasedmap"
        }

    public static layerOverview = AvailableBaseLayers.LoadRasterIndex().concat(AvailableBaseLayers.LoadProviderIndex());

    public static AvailableLayersAt(location: UIEventSource<Loc>): UIEventSource<BaseLayer[]> {
        const source = location.map(
            (currentLocation) => {

                if (currentLocation === undefined) {
                    return AvailableBaseLayers.layerOverview;
                }

                const currentLayers = source?.data; // A bit unorthodox - I know
                const newLayers = AvailableBaseLayers.CalculateAvailableLayersAt(currentLocation?.lon, currentLocation?.lat);

                if (currentLayers === undefined) {
                    return newLayers;
                }
                if (newLayers.length !== currentLayers.length) {
                    return newLayers;
                }
                for (let i = 0; i < newLayers.length; i++) {
                    if (newLayers[i].name !== currentLayers[i].name) {
                        return newLayers;
                    }
                }

                return currentLayers;
            });
        return source;
    }

    public static SelectBestLayerAccordingTo(location: UIEventSource<Loc>, preferedCategory: UIEventSource<string | string[]>): UIEventSource<BaseLayer> {
        return AvailableBaseLayers.AvailableLayersAt(location).map(available => {
            // First float all 'best layers' to the top
            available.sort((a, b) => {
                    if (a.isBest && b.isBest) {
                        return 0;
                    }
                    if (!a.isBest) {
                        return 1
                    }

                    return -1;
                }
            )

            if (preferedCategory.data === undefined) {
                return available[0]
            }

            let prefered: string []
            if (typeof preferedCategory.data === "string") {
                prefered = [preferedCategory.data]
            } else {
                prefered = preferedCategory.data;
            }

            prefered.reverse();
            for (const category of prefered) {
                //Then sort all 'photo'-layers to the top. Stability of the sorting will force a 'best' photo layer on top
                available.sort((a, b) => {
                        if (a.category === category && b.category === category) {
                            return 0;
                        }
                        if (a.category !== category) {
                            return 1
                        }

                        return -1;
                    }
                )
            }
            return available[0]
        })
    }

    private static CalculateAvailableLayersAt(lon: number, lat: number): BaseLayer[] {
        const availableLayers = [AvailableBaseLayers.osmCarto]
        const globalLayers = [];
        for (const layerOverviewItem of AvailableBaseLayers.layerOverview) {
            const layer = layerOverviewItem;

            if (layer.feature?.geometry === undefined || layer.feature?.geometry === null) {
                globalLayers.push(layer);
                continue;
            }

            if (lon === undefined || lat === undefined) {
                continue;
            }

            if (GeoOperations.inside([lon, lat], layer.feature)) {
                availableLayers.push(layer);
            }
        }

        return availableLayers.concat(globalLayers);
    }

    private static LoadRasterIndex(): BaseLayer[] {
        const layers: BaseLayer[] = []
        // @ts-ignore
        const features = editorlayerindex.features;
        for (const i in features) {
            const layer = features[i];
            const props = layer.properties;

            if (props.id === "Bing") {
                // Doesnt work
                continue;
            }

            if (props.id === "MAPNIK") {
                // Already added by default
                continue;
            }

            if (props.overlay) {
                continue;
            }

            if (props.url.toLowerCase().indexOf("apikey") > 0) {
                continue;
            }

            if (props.max_zoom < 19) {
                // We want users to zoom to level 19 when adding a point
                // If they are on a layer which hasn't enough precision, they can not zoom far enough. This is confusing, so we don't use this layer
                continue;
            }

            if (props.name === undefined) {
                console.warn("Editor layer index: name not defined on ", props)
                continue
            }

            const leafletLayer: () => TileLayer = () => AvailableBaseLayers.CreateBackgroundLayer(
                props.id,
                props.name,
                props.url,
                props.name,
                props.license_url,
                props.max_zoom,
                props.type.toLowerCase() === "wms",
                props.type.toLowerCase() === "wmts"
            )

            // Note: if layer.geometry is null, there is global coverage for this layer
            layers.push({
                id: props.id,
                max_zoom: props.max_zoom ?? 25,
                min_zoom: props.min_zoom ?? 1,
                name: props.name,
                layer: leafletLayer,
                feature: layer,
                isBest: props.best ?? false,
                category: props.category
            });
        }
        return layers;
    }

    private static LoadProviderIndex(): BaseLayer[] {
        // @ts-ignore
        X; // Import X to make sure the namespace is not optimized away
        function l(id: string, name: string): BaseLayer {
            try {
                const layer: any = () => L.tileLayer.provider(id, undefined);
                return {
                    feature: null,
                    id: id,
                    name: name,
                    layer: layer,
                    min_zoom: layer.minzoom,
                    max_zoom: layer.maxzoom,
                    category: "osmbasedmap",
                    isBest: false
                }
            } catch (e) {
                console.error("Could not find provided layer", name, e);
                return null;
            }
        }

        const layers = [
            l("CyclOSM", "CyclOSM - A bicycle oriented map"),
            l("Stamen.TonerLite", "Toner Lite (by Stamen)"),
            l("Stamen.TonerBackground", "Toner Background - no labels (by Stamen)"),
            l("Stamen.Watercolor", "Watercolor (by Stamen)"),
            l("Stadia.OSMBright", "Osm Bright (by Stadia)"),
            l("CartoDB.Positron", "Positron (by CartoDB)"),
            l("CartoDB.PositronNoLabels", "Positron  - no labels (by CartoDB)"),
            l("CartoDB.Voyager", "Voyager (by CartoDB)"),
            l("CartoDB.VoyagerNoLabels", "Voyager  - no labels (by CartoDB)"),
        ];
        return Utils.NoNull(layers);

    }

    /**
     * Converts a layer from the editor-layer-index into a tilelayer usable by leaflet
     */
    private static CreateBackgroundLayer(id: string, name: string, url: string, attribution: string, attributionUrl: string,
                                         maxZoom: number, isWms: boolean, isWMTS?: boolean): TileLayer {

        url = url.replace("{zoom}", "{z}")
            .replace("&BBOX={bbox}", "")
            .replace("&bbox={bbox}", "");

        const subdomainsMatch = url.match(/{switch:[^}]*}/)
        let domains: string[] = [];
        if (subdomainsMatch !== null) {
            let domainsStr = subdomainsMatch[0].substr("{switch:".length);
            domainsStr = domainsStr.substr(0, domainsStr.length - 1);
            domains = domainsStr.split(",");
            url = url.replace(/{switch:[^}]*}/, "{s}")
        }


        if (isWms) {
            url = url.replace("&SRS={proj}", "");
            url = url.replace("&srs={proj}", "");
            const paramaters = ["format", "layers", "version", "service", "request", "styles", "transparent", "version"];
            const urlObj = new URL(url);

            const isUpper = urlObj.searchParams["LAYERS"] !== null;
            const options = {
                maxZoom: maxZoom ?? 19,
                attribution: attribution + " | ",
                subdomains: domains,
                uppercase: isUpper,
                transparent: false
            };

            for (const paramater of paramaters) {
                let p = paramater;
                if (isUpper) {
                    p = paramater.toUpperCase();
                }
                options[paramater] = urlObj.searchParams.get(p);
            }

            if (options.transparent === null) {
                options.transparent = false;
            }


            return L.tileLayer.wms(urlObj.protocol + "//" + urlObj.host + urlObj.pathname, options);
        }

        if (attributionUrl) {
            attribution = `<a href='${attributionUrl}' target='_blank'>${attribution}</a>`;
        }

        return L.tileLayer(url,
            {
                attribution: attribution,
                maxZoom: maxZoom,
                minZoom: 1,
                // @ts-ignore
                wmts: isWMTS ?? false,
                subdomains: domains
            });
    }


}