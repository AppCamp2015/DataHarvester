var splunklogin = false;
var runningjobs = null;
var currentJobs = [];
var map;
var splunkMacros = [];
var sliders = {};

$('document').ready(function() {

    loginToSplunk();
    generateMap();
    addSlider($('#slider-range-health'), $('#healthRateValue'));
    addSlider($('#slider-range-pollution'), $('#pollutionRateValue'));
    addSlider($('#slider-range-crime'), $('#crimeRateValue'));
    addSlider($('#slider-range-urbanness'), $('#urbannessRateValue'));
    addSlider($('#slider-range-greenness'), $('#greennessRateValue'));
    executeSplunk();
});



function splunkSearch() {

    var obj = {};
    var objects = $('.rangeFilter');

    obj['queryName'] = document.getElementById('searchName').value;


    for (var i = 0; i < objects.length; i++) {
        console.log(i);
        var id = objects[i].getAttribute('id');
        var value = objects[i].value;

        obj[id] = value / 100;
    };
    console.log('object for splunk search:', obj);
    console.log(generateBBOX());
    if (splunklogin == true) {
        executeSplunk();
    } else {
        loginToSplunk();
    }
}

function addSlider(sliderId, valueId) {

    var sliderId = sliderId;
    var valueId = valueId;
    $(sliderId).slider({
        range: true,
        min: 0,
        max: 100,
        values: [0, 100],
        create: function(event, ui) {
            sliders[sliderId[0].id] = {};
            sliders[sliderId[0].id]['min'] = 0;
            sliders[sliderId[0].id]['max'] = 1;
            createMacro(sliderId[0].id);
        },
        slide: function(event, ui) {
            $(valueId).val(ui.values[0] + "% - " + ui.values[1] + "%");
        },
        change: function(event, ui) {
            sliders[sliderId[0].id]['min'] = ui.values[0] / 100;
            sliders[sliderId[0].id]['max'] = ui.values[1] / 100;
            executeSplunk();

        }
    });
    $(valueId).val($(sliderId).slider("values", 0) +
        "% - " + $(sliderId).slider("values", 1) + "%");
}

function loginToSplunk() {
    http = new splunkjs.ProxyHttp("/proxy");
    service = new splunkjs.Service(http, {
        username: "esa",
        password: "esa",
    });
    service.login(function(err, success) {
        if (err) {
            throw err;
        }
        console.log("Login was successful: " + success);
        splunklogin = true;
    });
};

function handleSplunkJob(macroDef) {


    var search = macroDef.queryString;
    var cancelled = false;

    service.oneshotSearch(
        search, {},
        function(err, results) {
            if (cancelled) {
                return
            };
            macroDef.applyResults(results, err);
        }
    );
    return function() {
        if (!cancelled) {
            cancelled = true;
        }
    }
};

function generateBBOX() {
    var view = map.getView();
    var extent = view.calculateExtent(map.getSize());
    var bottomLeft = ol.proj.toLonLat([extent[0], extent[1]]);
    var topRight = ol.proj.toLonLat([extent[2], extent[3]]);

    return bottomLeft.concat(topRight);

};

function generateMap() {
    var vectorSource = new ol.source.Vector({
        url: 'assets/countries.geo.json',
        format: new ol.format.GeoJSON()
    });

    map = new ol.Map({
        target: 'map',
        layers: [
            new ol.layer.Tile({
                source: new ol.source.MapQuest({
                    layer: 'sat'
                })
            }),
            new ol.layer.Vector({
                source: vectorSource


            })
        ],
        view: new ol.View({
            center: ol.proj.transform([37.41, 8.82], 'EPSG:4326', 'EPSG:3857'),
            zoom: 4
        })
    });

    // a normal select interaction to handle click
    var select = new ol.interaction.Select();
    map.addInteraction(select);

    map.on('moveend', (function() {
        if (splunklogin == true) {
            executeSplunk();
        } else {
            loginToSplunk();
        }

    }))

    var selectedFeatures = select.getFeatures();

    // a DragBox interaction used to select features by drawing boxes
    var dragBox = new ol.interaction.DragBox({
        condition: ol.events.condition.shiftKeyOnly,
        style: new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: [0, 0, 255, 1]
            })
        })
    });

    map.addInteraction(dragBox);

    var infoBox = document.getElementById('info');

    dragBox.on('boxend', function(e) {
        // features that intersect the box are added to the collection of
        // selected features, and their names are displayed in the "info"
        // div
        var info = [];
        var extent = dragBox.getGeometry().getExtent();
        console.log(extent);
        vectorSource.forEachFeatureIntersectingExtent(extent, function(feature) {
            selectedFeatures.push(feature);
            info.push(feature.get('name'));
        });
        if (info.length > 0) {
            infoBox.innerHTML = info.join(', ');
        }
    });


};

function executeSplunk() {
    // get the value of the search div
    currentJobs.forEach(function(job) {
        job();
    });
    currentJobs = [];

    // var splunkMacros = getSplunkMacros();

    splunkMacros.forEach(function(macro) {
        var macroDef = macro.getMacroDef();
        currentJobs.push(handleSplunkJob(macroDef));
    });
};

function generateQueryString(chartName, macro) {
    return " `" + chartName + "(" +
        macro.minLat + "," + macro.maxLat + "," + macro.minLong + "," + macro.maxLong + "," + macro.sliderValues['slider-range-pollution']['min'] +
        "," + macro.sliderValues['slider-range-pollution']['max'] +
        "," + macro.sliderValues['slider-range-crime']['min'] + "," + macro.sliderValues['slider-range-crime']['max'] + "," + macro.sliderValues['slider-range-health']['min'] +
        "," + macro.sliderValues['slider-range-health']['max'] + "," + macro.sliderValues['slider-range-urbanness']['min'] + "," + macro.sliderValues['slider-range-urbanness']['max'] + "," + macro.sliderValues['slider-range-greenness']['min'] + "," + macro.sliderValues['slider-range-greenness']['max'] + ")`";
}

// A splunk macro query builder takes in values for each splunk macro and generates the correct values
// 
function splunkMacro(bbox, sliderValues) {
    this.minLat = bbox[1];
    this.maxLat = bbox[3];
    this.minLong = bbox[0];
    this.maxLong = bbox[2];
    this.sliderValues = sliderValues;
};

function pollutionChartMacro() {
    var chart = new splunkjs.UI.Charting.Chart($("#pollutionchart"), splunkjs.UI.Charting.ChartType.COLUMN, false);
    var chartMode = {
        "chart.stackMode": "stacked"
    };
    var searchString = function() {
        var macro = new splunkMacro(generateBBOX(), sliders);
        return generateQueryString('pollution_chart', macro);
    };
    this.getMacroDef = function() {
        // this regenerates the searchstring based on current values e.g call the macro function once 
        return new macroDef(searchString(), function(results, err) {
            chart.setData(results, chartMode);
            chart.draw();
        });
    }
};

function healthChartMacro() {
    var chart = new splunkjs.UI.Charting.Chart($("#healthchart"), splunkjs.UI.Charting.ChartType.COLUMN, false);
    var chartMode = {
        "chart.stackMode": "stacked"
    };
    var searchString = function() {
        var macro = new splunkMacro(generateBBOX(), sliders);
        return generateQueryString('health_chart', macro);
    };
    this.getMacroDef = function() {
        // this regenerates the searchstring based on current values e.g call the macro function once 
        return new macroDef(searchString(), function(results, err) {
            chart.setData(results, chartMode);
            chart.draw();
        });
    }
};

function crimeChartMacro() {
    var chart = new splunkjs.UI.Charting.Chart($("#crimechart"), splunkjs.UI.Charting.ChartType.COLUMN, false);
    var chartMode = {
        "chart.stackMode": "stacked"
    };
    var searchString = function() {
        var macro = new splunkMacro(generateBBOX(), sliders);
        return generateQueryString('pollution_chart', macro);
    };
    this.getMacroDef = function() {
        // this regenerates the searchstring based on current values e.g call the macro function once 
        return new macroDef(searchString(), function(results, err) {
            chart.setData(results, chartMode);
            chart.draw();
        });
    }

};

function urbanChartMacro() {
    var chart = new splunkjs.UI.Charting.Chart($("#urbanchart"), splunkjs.UI.Charting.ChartType.COLUMN, false);
    var chartMode = {
        "chart.stackMode": "stacked"
    };
    var searchString = function() {
        var macro = new splunkMacro(generateBBOX(), sliders);
        return generateQueryString('urbanness_chart', macro);
    };
    this.getMacroDef = function() {
        // this regenerates the searchstring based on current values e.g call the macro function once 
        return new macroDef(searchString(), function(results, err) {
            chart.setData(results, chartMode);
            chart.draw();
        });
    }

};

function greenChartMacro() {
    var chart = new splunkjs.UI.Charting.Chart($("#greenchart"), splunkjs.UI.Charting.ChartType.COLUMN, false);
    var chartMode = {
        "chart.stackMode": "stacked"
    };
    var searchString = function() {
        var macro = new splunkMacro(generateBBOX(), sliders);
        return generateQueryString('greenness_chart', macro);
    };
    this.getMacroDef = function() {
        // this regenerates the searchstring based on current values e.g call the macro function once 
        return new macroDef(searchString(), function(results, err) {
            chart.setData(results, chartMode);
            chart.draw();
        });
    }
};


function cityListMacro() {

    var macro = new splunkMacro(generateBBOX(), sliders);
    var searchString = function() {
        var macro = new splunkMacro(generateBBOX(), sli);
        return generateQueryString('city_list', macro);
    };
    this.getMacroDef = function() {
        // this regenerates the searchstring based on current values e.g call the macro function once 
        return new macroDef(searchString(), function(results, err) {});
    }
};

function macroDef(queryString, applyResults) {
    this.queryString = queryString;
    this.applyResults = applyResults;
};

function createMacro(sliderName) {
    switch (sliderName) {
        case 'slider-range-pollution':
            splunkMacros.push(new pollutionChartMacro());
            break;
        case 'slider-range-crime':
            splunkMacros.push(new crimeChartMacro());
            break;
        case 'slider-range-health':
            splunkMacros.push(new healthChartMacro());
            break;
        case 'slider-range-urbanness':
            splunkMacros.push(new urbanChartMacro());
            break;
        case 'slider-range-greenness':
            splunkMacros.push(new greenChartMacro());
            break;
        default:
            console.log('no valid slider provided');
            break;
    }
};