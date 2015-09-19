function splunkSearch(){
    
    var obj= {};
    var objects = $('.rangeFilter');

    obj['queryName'] = document.getElementById('searchName').value;


    for(var i =0;i<objects.length; i++){
        console.log(i);
        var id = objects[i].getAttribute('id');
        var value = objects[i].value;
        
        obj[id] = value/100;
    };
    console.log('object for splunk search:', obj); 
}

function selectCategory(id){
    var newLabel = document.createElement('label');
    var newRangeFilter = document.createElement('input');
    newRangeFilter.setAttribute('class',"rangeFilter");
    newRangeFilter.setAttribute('type',"range");
    newRangeFilter.setAttribute('id',id + "range");
    newRangeFilter.setAttribute('min', "0");
    newRangeFilter.setAttribute('max', "100");
    newRangeFilter.setAttribute('value', "");
    newRangeFilter.setAttribute('onchange', "splunkSearch()");
    newLabel.innerHTML = id;
    document.getElementById('timeSearch').appendChild(newLabel);
    document.getElementById('timeSearch').appendChild(newRangeFilter);
    document.getElementById(id).remove(); 
}


function addSlider(sliderId, valueId ) {
    $( sliderId ).slider({
      range: true,
      min: 0,
      max: 100,
      values: [ 25, 75 ],
      slide: function( event, ui ) {
        $( valueId).val( ui.values[ 0 ] + "% - " + ui.values[ 1 ] + "%");
      },
    });
    $( valueId ).val( $( sliderId ).slider( "values", 0 ) +
      "% - " + $( sliderId ).slider( "values", 1 ) + "%" );
}

function loginToSplunk(){
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

function generateMap(){
    var vectorSource = new ol.source.Vector({
         url: 'assets/countries.geo.json',
         format: new ol.format.GeoJSON()
       });

       var map = new ol.Map({
         target: 'map',
         layers: [
           new ol.layer.Tile({
             source: new ol.source.MapQuest({layer: 'sat'})
           })
         ,
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
       
       map.on('moveend',(function(){
         
         var view = map.getView();
         var extent = view.calculateExtent(map.getSize());
         var bottomLeft = ol.proj.toLonLat([extent[0],extent[1]]);
         var topRight  = ol.proj.toLonLat([extent[2],extent[3]]);
         var bbox = bottomLeft.concat(topRight);
         console.log(bbox);
         if (splunklogin == true){
            executeSplunk(bbox);   
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
var splunklogin = false
$('document').ready(function(){

    loginToSplunk();
    generateMap();
});


   
              function executeSplunk(bbox){
                // get the value of the search div

                var maxlat = bbox[3];
                var minlat = bbox[1]; 
                var minlong = bbox[0];
                var maxlong = bbox[2];

                var http = new splunkjs.ProxyHttp("/proxy");
                var service = new splunkjs.Service(http, {
                    username: "esa",
                    password: "esa",
            });
            
            console.log("`pollution_chart(" + minlat + "," + maxlat + "," + minlong + ","+ maxlong +",0,1)`");
            service.jobs().create(" `pollution_chart(" + minlat + "," + maxlat + "," + minlong + ","+ maxlong +",0,1)`",{
                status_buckets: 300
            }, function(err, job){
                if(err){
                    console.log(err);
                    return;
                }
                console.log('job created');
                job.track({}, {
                    error: function(err) {
                        console.log('job error: '+err);
                    },
                    done: function(job) {
                        console.log('job done');
                        job.results({
                            output_mode: "json_cols"
                        }, function(err, results){
                            if(err){
                                console.log(err);
                                return;
                            }
                            console.log(results);
                            var chart = new splunkjs.UI.Charting.Chart($("#chart1"), splunkjs.UI.Charting.ChartType.COLUMN, false);
                            chart.setData(results, {
                                "chart.stackMode": "stacked"
                            });
                            chart.draw();
                        });
                    }
                });
            });
        };