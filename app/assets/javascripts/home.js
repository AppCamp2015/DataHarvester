var splunklogin = false;
var runningjobs = null;
var currentJobs = [];
var map;
var splunkMacros;

$('document').ready(function() {

    loginToSplunk();
    generateMap();
    splunkMacros = getSplunkMacros();
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


function selectCategory(id) {
    var newLabel = document.createElement('label');
    var newdiv = document.createElement('input');
    newdiv.setAttribute('class', "rangeFilter");
    newdiv.setAttribute('type', "range");
    newdiv.setAttribute('id', id + "range");
    newdiv.setAttribute('min', "0");
    newdiv.setAttribute('max', "100");
    newdiv.setAttribute('value', "");
    newLabel.innerHTML = id;
    document.getElementById('timeSearch').appendChild(newLabel);
    document.getElementById('timeSearch').appendChild(newdiv);
    document.getElementById(id).remove();
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


    var search = macroDef.search;
    var thisjob = null;

    service.jobs().create(search, {
        status_buckets: 300
    }, function(err, job) {
        if (err) {
            console.log(err);
            return;
        }
        thisjob = job;
        console.log('job created');
        job.track({}, {
            error: function(err) {
                if (thisjob == null) {
                    return;
                }
                console.log('job error: ' + err);
                thisjob = null;

            },
            done: function(job) {
                if (thisjob == null) {
                    return;
                }
                console.log('job done');
                job.results({
                    output_mode: "json_cols"
                }, function(err, results) {
                    if (thisjob == null) {
                        return;
                    }
                    thisjob = null;
                    console.log(results);
                    macroDef.applyResults(results, err);
                });
            }
        });
    });


    return function() {
        if (thisjob) {
            thisjob.cancel(function(err) {
                console.log('Job cancel failed')
            });
            thisjob = null;
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
        var chart = new splunkjs.UI.Charting.Chart($("#chart1"), splunkjs.UI.Charting.ChartType.COLUMN, false);
        var chartMode = {
            "chart.stackMode": "stacked"
        };
        var macro = new splunkMacro(generateBBOX(), getSliderValues());
        var searchString = function() {
            var macro = new splunkMacro(generateBBOX(), getSliderValues());
            return " `pollution_chart(" +
                macro.minLong + "," + macro.maxLong + "," + macro.minLat + "," + macro.minLat + "," + macro.sliders['pollution']['min'] +
                "," + macro.sliders['pollution']['max'] +
                "," + macro.sliders['crime']['min'] + "," + macro.sliders['crime']['max'] + "," + macro.sliders['health']['min'] + "," + macro.sliders['health']['max'] + ")`";
        };
        this.getMacroDef = function() {
            // this regenerates the searchstring based on current values e.g call the macro function once 
            return new macroDef(searchString(), function(results, err) {
                chart.setData(results, chartmode);
                chart.draw();
            });
        }
    };

    function crimeChartMacro() {
        var chart = new splunkjs.UI.Charting.Chart($("#crimechart"), splunkjs.UI.Charting.ChartType.COLUMN, false);
        var chartMode = {
            "chart.stackMode": "stacked"
        };
        var macro = new splunkMacro(generateBBOX(), getSliderValues());
        var searchString = function() {
            var macro = new splunkMacro(generateBBOX(), getSliderValues());
            return " `crime_chart(" +
                macro.minLong + "," + macro.maxLong + "," + macro.minLat + "," + macro.minLat + "," + macro.sliders['pollution']['min'] +
                "," + macro.sliders['pollution']['max'] +
                "," + macro.sliders['crime']['min'] + "," + macro.sliders['crime']['max'] + "," + macro.sliders['health']['min'] + "," + macro.sliders['health']['max'] + ")`";
        };
        this.getMacroDef = function() {
            // this regenerates the searchstring based on current values e.g call the macro function once 
            return new macroDef(searchString(), function(results, err) {
                chart.setData(results, chartmode);
                chart.draw();
            });
        }

    };

    function cityListMacro() {

        var macro = new splunkMacro(generateBBOX(), getSliderValues());
        var searchString = function() {
            var macro = new splunkMacro(generateBBOX(), getSliderValues());
            return " `city_list(" +
                macro.minLong + "," + macro.maxLong + "," + macro.minLat + "," + macro.minLat + "," + macro.sliders['pollution']['min'] +
                "," + macro.sliders['pollution']['max'] +
                "," + macro.sliders['crime']['min'] + "," + macro.sliders['crime']['max'] + "," + macro.sliders['health']['min'] + "," + macro.sliders['health']['max'] + ")`";
        };
        this.getMacroDef = function() {
            // this regenerates the searchstring based on current values e.g call the macro function once 
            return new macroDef(searchString(), function(results, err) {
               console.log(results); 
            });
        }
    };

    function macroDef(queryString, applyResults) {
        this.queryString = queryString;
        this.applyResults = applyResults;
    };


    function getSliderValues() {
        var sliders = $('.slider');

    };