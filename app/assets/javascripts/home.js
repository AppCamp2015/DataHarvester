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
    newLabel.setAttribute('id', id+"range-Label");
    newLabel.setAttribute('class',"rangeFilterLabel");
    document.getElementById('timeSearch').appendChild(newLabel);
    document.getElementById('timeSearch').appendChild(newRangeFilter);
    document.getElementById(id).remove(); 
}

