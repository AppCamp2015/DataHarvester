var splunklogin = false;
var runningjobs = null;
var currentJobs = [];
var map;

$('document').ready(function() {

    loginToSplunk();
    generateMap();
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

function handleSplunkJob(search, chart, chartmode) {

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
                    if (err) {
                        console.log(err);
                        return;
                    }
                    console.log(results);
                    chart.setData(results, chartmode);
                    chart.draw();
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
        var bbox = generateBBOX();
        console.log(bbox);
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

function executeSplunk(splunkMacros) {
    // get the value of the search div
    currentJobs.forEach(function(job) {
        job();
    });
    currentJobs = [];

    var bbox = generateBBOX();
    console.log("bounding box: " + bbox);
    var slidervalues = splunkSearch();

    var firstbboxSearch = " `pollution_chart(" + bbox[1] + "," + bbox[3] + "," + bbox[0] + "," + bbox[2] + ",0,1,0,1)`";
    var firstcountrieschart = new splunkjs.UI.Charting.Chart($("#chart1"), splunkjs.UI.Charting.ChartType.COLUMN, false);
    var firstchartmode = {
        "chart.stackMode": "stacked"
    };

    currentJobs.push(handleSplunkJob(firstbboxSearch, firstcountrieschart, firstchartmode));
    currentJobs.push(handleSplunkJob(secondbboxSearch, secondcountrieschart, secondchartmode));

};



function splunkMacro(bbox,slider,chartType){
    this.bbox = bbox;
    this.slidervalues = slider;
    this.chartType = chartType;
    this.generateMacroDef = function(){
        
    };
}