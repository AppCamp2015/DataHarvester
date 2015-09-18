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
    var newdiv = document.createElement('input');
    newdiv.setAttribute('class',"rangeFilter");
    newdiv.setAttribute('type',"range");
    newdiv.setAttribute('id',id + "range");
    newdiv.setAttribute('min', "0");
    newdiv.setAttribute('max', "100");
    newdiv.setAttribute('value', "");
    newLabel.innerHTML = id;
    newLabel.setAttribute('id', id+"range-Label");
    document.getElementById('timeSearch').appendChild(newLabel);
    document.getElementById('timeSearch').appendChild(newdiv);
    document.getElementById(id).remove(); 
}
