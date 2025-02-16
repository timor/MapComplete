
URL-parameters and URL-hash
============================

This document gives an overview of which URL-parameters can be used to influence MapComplete.

What is a URL parameter?
------------------------

URL-parameters are extra parts of the URL used to set the state.

For example, if the url is `https://mapcomplete.osm.be/cyclofix?lat=51.0&lon=4.3&z=5&test=true#node/1234`,
the URL-parameters are stated in the part between the `?` and the `#`. There are multiple, all seperated by `&`, namely:

- The url-parameter `lat` is `51.0` in this instance
- The url-parameter `lon` is `4.3` in this instance
- The url-parameter `z` is `5` in this instance
- The url-parameter `test` is `true` in this instance

Finally, the URL-hash is the part after the `#`. It is `node/1234` in this case.


 layer-control-toggle 
----------------------

 Whether or not the layer control is shown The default value is _false_


 filter-toggle 
---------------

 Whether or not the filter view is shown The default value is _false_


 tab 
-----

 The tab that is shown in the welcome-message. 0 = the explanation of the theme,1 = OSM-credits, 2 = sharescreen, 3 = more themes, 4 = about mapcomplete (user must be logged in and have >50 changesets) The default value is _0_


 z 
---

 The initial/current zoom level The default value is _0_


 lat 
-----

 The initial/current latitude The default value is _0_


 lon 
-----

 The initial/current longitude of the app The default value is _0_


 fs-userbadge 
--------------

 Disables/Enables the user information pill (userbadge) at the top left. Disabling this disables logging in and thus disables editing all together, effectively putting MapComplete into read-only mode. The default value is _true_


 fs-search 
-----------

 Disables/Enables the search bar The default value is _true_


 fs-layers 
-----------

 Disables/Enables the layer control The default value is _true_


 fs-filter 
-----------

 Disables/Enables the filter The default value is _true_


 fs-add-new 
------------

 Disables/Enables the 'add new feature'-popup. (A theme without presets might not have it in the first place) The default value is _true_


 fs-welcome-message 
--------------------

 Disables/enables the help menu or welcome message The default value is _true_


 fs-iframe 
-----------

 Disables/Enables the iframe-popup The default value is _false_


 fs-more-quests 
----------------

 Disables/Enables the 'More Quests'-tab in the welcome message The default value is _true_


 fs-share-screen 
-----------------

 Disables/Enables the 'Share-screen'-tab in the welcome message The default value is _true_


 fs-geolocation 
----------------

 Disables/Enables the geolocation button The default value is _true_


 fs-all-questions 
------------------

 Always show all questions The default value is _false_


 test 
------

 If true, 'dryrun' mode is activated. The app will behave as normal, except that changes to OSM will be printed onto the console instead of actually uploaded to osm.org The default value is _false_


 debug 
-------

 If true, shows some extra debugging help such as all the available tags on every object The default value is _false_


 fake-user 
-----------

 If true, 'dryrun' mode is activated and a fake user account is loaded The default value is _false_


 backend 
---------

 The OSM backend to use - can be used to redirect mapcomplete to the testing backend when using 'osm-test' The default value is _osm_


 custom-css 
------------

 If specified, the custom css from the given link will be loaded additionaly The default value is __


 background 
------------

 The id of the background layer to start with The default value is _osm_


 layer-<layer-id> 
------------------

 Wether or not the layer with id <layer-id> is shown The default value is _true_ Generated from QueryParameters