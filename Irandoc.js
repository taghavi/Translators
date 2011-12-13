{
        "translatorID": "40b7fd40-d9a5-4bd7-a046-6950a6a0f2c1",
        "label": "Irandoc",
        "creator": "CRCIS",
        "target": "database.irandoc.ac.ir/DL/Search/",
        "minVersion": "1.0",
        "maxVersion": "",
        "priority": 100,
        "inRepository": true,
        "translatorType": 4,
        "lastUpdated": "2011-08-01 18:30:39"
}

//one difficulty in developing this translator was frames
//the site makes new frames after every search. 
//Translator should find out which frame
//is active now and scrape items from the active frame.

function getActiveFrame(doc,url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
	if (prefix == 'x') return namespace; else return null;
	} : null;
	var XPath = '//iframe'; 
	var theXPathObject=doc.evaluate(XPath,doc,nsResolver, XPathResult.ANY_TYPE, null);
	var theFrame;
	var i=-1;
	while (theFrame=theXPathObject.iterateNext())
	{
		i++; //just for debug purposes
		Zotero.debug("examining frame "+i);
		var subDoc=theFrame.contentDocument;
		var tmp=subDoc.body;
		var theStyle=subDoc.defaultView.getComputedStyle(tmp,null);
		//if the theStyle is not "undefined" the frame is the active one
		if (theStyle){	
			Zotero.debug("the active frame found");
			result=subDoc;
			break;
		}
	}
	return result;
}
	
function detectWeb(doc, url)  {
	if (url.match("http://database.irandoc.ac.ir/DL/Search/")) {
		return "book";
	} else {
		return false;
	}
}


function theRealDetectWeb(doc, url)  {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
	if (prefix == 'x') return namespace; else return null;
	} : null;
	var result=false;
	var parentWindow=doc.defaultView.parent;
	var parentDoc=parentWindow.document;
	Zotero.debug("parentDoc: ",parentDoc.src);
	var subDoc=getActiveFrame(parentDoc,url);
	//var subDoc=doc;
	//var tmp=subDoc.body;
	//var theStyle=subDoc.defaultView.getComputedStyle(tmp,null);	
	//theStyle=true;
	Zotero.debug("url is: "+url);
	if (subDoc) {
		var XPath2='//div[@id="simplemodal-container"]/*/div[@id="documentDetailsContainer"]';
		var theXPathObject2=subDoc.evaluate(XPath2,subDoc,nsResolver, XPathResult.ANY_TYPE, null);
		var singleItemDiv=theXPathObject2.iterateNext();
		if (singleItemDiv) {
			result="book";
			return result;
		}
		var XPath3='//div[@id="resultPad"]/div[@id="recordsPad"]';
		Zotero.debug("XPath3: "+XPath3);
		var theXPathObject3=subDoc.evaluate(XPath3,subDoc,nsResolver, XPathResult.ANY_TYPE, null);
			
		var multipleDiv=theXPathObject3.iterateNext();
		if (multipleDiv) {
			result="multiple";
			return result;
		} 
	}
	if (!result) Zotero.debug("detectWeb returns false");
	return result;
}


function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
	if (prefix == 'x') return namespace; else return null;
	} : null;
	

	var items = new Object();
	var nextTitle;

	if (theRealDetectWeb(doc, url) == "multiple") {
		var availableItems = new Object();
		var subDoc=getActiveFrame(doc,url);
		var XPath1='//a[@class="actionLabel detailsAction"]';//used for scraping titles
		var theXPathObject1=subDoc.evaluate(XPath1,subDoc,nsResolver, XPathResult.ANY_TYPE, null);
		var nextItem;
		var articles=new Array();		
		var items=new Object();
		while (nextItem=theXPathObject1.iterateNext()) {
			//Zotero.debug(nextItem.textContent);
			//Zotero.debug(nextItem.id);
			//ids are something like action_1_6647_0
			//to get an item simply use this url: http://database.irandoc.ac.ir/DL/Search/GetDocDetails.aspx?docTypeCode=1&dc=6647
			//server returns a JSON containing bibliographic data
			var itemUrl=nextItem.id;	
			itemUrl=itemUrl.replace("action_","docTypeCode=");
			itemUrl=itemUrl.replace(/_(\d+)_0/,"&dc=$1");
			itemUrl="http://database.irandoc.ac.ir/DL/Search/GetDocDetails.aspx?"+itemUrl;
			//Zotero.debug(itemUrl);
			items[itemUrl]=nextItem.textContent;
		}
		var items = Zotero.selectItems(items);
		if(!items) {
			return true;
		}
		for (var i in items) {
			articles.push(i);
		}		
		Zotero.Utilities.processDocuments(articles, scrapeMultiple, function(){Zotero.done();});
		Zotero.wait();		
		
		
	} else {
		var XPath2='//div[@id="simplemodal-container"]/*/div[@id="documentDetailsContainer"]';
		var subDoc=getActiveFrame(doc,url);
		var theXPathObject2=subDoc.evaluate(XPath2,subDoc,nsResolver, XPathResult.ANY_TYPE, null);
		var singleItemDiv=theXPathObject2.iterateNext();
		if (singleItemDiv) {
			scrapeSingle(subDoc,singleItemDiv.innerHTML);			
		}
	}
}

function associateData (newItem, items, field, zoteroField) {
	if (items[field]) {
		newItem[zoteroField] = items[field];
	}
}

function scrapeSingle(doc,text) {
	Zotero.debug(text);
	text=text.replace(/<span.*span>/,"");
	var reg1=/(<b>).*?(<\/b>)/g;
	var reg2=/<\/b>.*?<br>/g;
	var title;
	var itemData=new Object();
	while (title=reg1.exec(text)) {
		var theTitle=title[0].replace(/(:\s<\/b>)|(<b>)/g,"");
		var value=reg2.exec(text);
		var theValue=value[0].replace(/(<\/b>)|(<br>)/g,"");
		itemData[theTitle]=theValue;
	}
	//determine itemType:
	//itemType can not be determined from data displayed in single item div
	//so I have to look at the selected list item and find out which item type
	//was selected before clicking on a particular item.
	//selected button is highlighted and its class changes to "listLinkSelected"
	//first button with id="li_1" corresponds to "thesis", second with id="li_2" corresponds to "report"
	//and so on
	var el=doc.getElementsByClassName("listLinkSelected")[0];
	var itemTypes={"li_1":"thesis","li_2":"report","li_3":"journalArticle","li_4":"report",
		"li_5":"conferencePaper","li_7":"thesis"};
	var itemType=(itemTypes[el.parentNode.id]);
	var newItem = new Zotero.Item(itemType);
	associateData(newItem,itemData,"عنوان","title");	
	if (itemData["نام دانشجو"]) {
		var authorText = abszhClean(itemData["نام دانشجو"].replace(/\u060C/g,','));
		newItem.creators.push(Zotero.Utilities.cleanAuthor(authorText, "author",true));
	}
	if (itemData["استاد راهنما"]) {
		var authorText = abszhClean(itemData["استاد راهنما"].replace(/\u060C/g,','));
		newItem.creators.push(Zotero.Utilities.cleanAuthor(authorText, "contributor",true));
	}
	associateData(newItem,itemData,"چکيده","abstractNote");	
	if (itemData["کليدواژه ها"]) {
		var tagsArray=itemData["کليدواژه ها"].split(String.fromCharCode(0x25c4));
		newItem.tags=tagsArray;
	}
	associateData(newItem,itemData,"دانشگاه","university");
	associateData(newItem,itemData,"سال اخذ مدرک","date");
	associateData(newItem,itemData,"مقطع تحصيلي","extra");
	if (itemData["رشته تحصيلي"]) {
		if (newItem["extra"]) {
			newItem["extra"]=itemData["رشته تحصيلي"]+" "+newItem["extra"];
		} else {
			newItem["extra"]=itemData["رشته تحصيلي"];
		}
	}
	newItem["language"]="fa";
	newItem.complete();
}

function scrapeMultiple(doc, url) {
	var itemData=JSON.parse(doc.body.textContent);
	for (var i in itemData.fields) {
		Zotero.debug("fields["+i+"]= "+itemData.fields[i]);
	}
	var itemTypeCode=itemData.docTypeCode;
	var itemTypes=["","thesis","report","journalArticle","report","conferencePaper","thesis","thesis"];
	var itemType=itemTypes[itemTypeCode];

	var newItem = new Zotero.Item(itemType);
	associateData(newItem,itemData.fields,0,"title");
	if (itemData.fields[2]) {
		var authorText = abszhClean(itemData.fields[2].replace(/\u060C/g,','));
		Zotero.debug("authorText: "+authorText);
		newItem.creators.push(Zotero.Utilities.cleanAuthor(authorText, "author",true));
	}
	if (itemData.fields[3]) {
		var authorText = abszhClean(itemData.fields[3].replace(/\u060C/g,','));
		Zotero.debug("authorText: "+authorText);
		newItem.creators.push(Zotero.Utilities.cleanAuthor(authorText, "contributor",true));
	}
	associateData(newItem,itemData.fields,5,"abstractNote");
	if (itemData.fields[7]) {
		var tagsArray=itemData.fields[7].split(String.fromCharCode(0x25c4));
		newItem.tags=tagsArray;
	}
	associateData(newItem,itemData.fields,8,"university");
	associateData(newItem,itemData.fields,9,"extra");
	associateData(newItem,itemData.fields,14,"date");
	newItem["language"]="fa";
	
	newItem.complete();	
}

function abszhClean(str) {
	str=str.replace(/\u060C/g,'');				//remove persian comma
	str=str.replace(/[\u0660-\u0669]/g,'');		//remove arabic numbers
	str=str.replace(/[\u06F0-\u06F9]/g,'');		//remove persian numbers
	str=str.replace(/[0-9]/g,'');				//remove english numbers
	str=str.replace(/-/g,'');					//remove dash
	return str;
}
//</abszh>