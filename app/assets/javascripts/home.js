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

 //   appendElementtoDropdown(id, $('#remove-filter-options'));

}

function removeFilter(removeItem){

 console.log('slider: ', document.getElementById(removeItem+"range")); 
 console.log('label: ', document.getElementById(removeItem+"range-Label")); 

 document.getElementById(removeItem+"range").remove(); 
 document.getElementById(removeItem+"range-Label").remove(); 
  
  var list = document.getElementById('remove-filter-options');
  var item = document.getElementById(removeItem);
  list.removeChild(item);
}

function appendElementtoDropdown(item, list){
    //add it to the list of filters that can be removed
    var newItem = document.createElement('li');

    newItem.setAttribute('id', item);
    newItem.setAttribute('value', item);
    console.log('newItem Id: ', newItem.id);
    newItem.onclick = removeFilter(newItem.id); 
    console.log('click: ', newItem.onclick );
    console.log('value',$('#'+item).val);
    list.append(item);
    console.log('list: ', list);
    console.log('item: ', item);
}