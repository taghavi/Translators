{
        "translatorID": "f07d24c1-f161-4900-8bf1-fde274bbef95",
        "translatorType": 4,
        "label": "National Library and Archives of Iran",
        "creator": "CRCIS",
        "target": "(opac.nlai.ir/opac-prod/search/)|(213.207.203.37:8080/opac/search/)",
        "minVersion": "1.0",
        "maxVersion": "",
        "priority": 100,
        "inRepository": true,
        "configOptions": null,
        "displayOptions": null,
        "lastUpdated": "2011-11-27 06:40:27"
}

//most of the code is from "Library Catalog (Voyager)" by "Simon Kornblith"
//this zotero translator detects items in search results page of www.nlai.ir
//IRANMARC translator is needed to translate the IRANMARC records from "nlai.ir"


function detectWeb(doc, url)  {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
	if (prefix == 'x') return namespace; else return null;
	} : null;
	Zotero.debug(namespace);
	Zotero.debug ("url is: "+url);
	if (url.indexOf("http://opac.nlai.ir/opac-prod/search/briefListSearch.do?command=FULL_VIEW&id=")>-1) {
		return "book";
	} else if (url.indexOf("http://213.207.203.37:8080/opac/search/briefListSearch.do?command=FULL_VIEW&id=")>-1) {
		return "book";
	}
		

	var XPath='//x:table[@id="table10"]/x:tbody/x:tr[3]/x:td[2]/select/option[1]';
	Zotero.debug(XPath);
	var theXPathObject=doc.evaluate(XPath,doc,nsResolver, XPathResult.ANY_TYPE, null);
	Zotero.debug("theXPathObject is: "+theXPathObject);
	var option;
	option=theXPathObject.iterateNext();
	Zotero.debug("option is: "+option);
//adding this comment just to test update
	//var isoStrFa="ایزو";
	//var isoStrEn="ISO format";
	
	var labelStrFa="فرمت برچسبی";
	var labelStrEn="Label format";
	if ((option.textContent.indexOf(labelStrFa))>=0) {
		return "multiple";
	} else if ((option.textContent.indexOf(labelStrEn))>=0) {
		return "multiple";
	} else {
		return null;
	}	
}


function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
	if (prefix == 'x') return namespace; else return null;
	} : null;
	var postString = 'sortKeyValue1=sortkey_title&sortKeyValue2=sortkey_author&';

	var form=doc.forms[0];
	var newUri=form.action;
	var currentId=0;
	
	
	var articles = new Array();
	var availableItems = new Object();
	var checkboxes=new Array();
	var nextTitle;
	var n=0;
	var detectedWeb=detectWeb(doc, url);
	if ( detectedWeb == "book") {
		newUri=url.replace("command=FULL_VIEW","command=SAVE_PRINT&selectionFormat=5&");
		var ttemp="";
		ttemp=url.match(/\&id=\d+\&/)+" ";
		currentId=ttemp.match(/\d+/);
		Zotero.debug("currentId: "+currentId+" ");
		
		
	} else if (detectedWeb == "multiple") {
		var XPath1='//table[@id="table"]/tbody/tr/td[3]/a';
		var XPath2='//table[@id="table"]/tbody/tr/td[1]/input';
		var Xtitles = doc.evaluate(XPath1, doc, nsResolver, XPathResult.ANY_TYPE, null);
		var Xcheckboxes=doc.evaluate(XPath2, doc, nsResolver, XPathResult.ANY_TYPE, null);
		while (nextTitle = Xtitles.iterateNext()) {
			var nextCheckBox=Xcheckboxes.iterateNext();
			//replace ommits spaces 
			availableItems[n] = nextTitle.textContent.replace(/^\s*|\s*$/g, ''); 
			checkboxes[n]=nextCheckBox;
			n++;
		}
		var items = Zotero.selectItems(availableItems);
		if(!items) {
			return true;
		}
		
		for (var i in items) {
			articles.push(i);
			postString+=checkboxes[i].name+"=on"+"&";
			Zotero.debug("postString+= "+checkboxes[i].name+"=on"+"&");
		}
	
		for(var i=0; i<form.elements.length; i++) {
			if(form.elements[i].type && form.elements[i].type.toLowerCase() == 'hidden') {
				if (form.elements[i].name=="command") {
					postString+='command=SAVE_PRINT&';
					Zotero.debug("postString+= "+'command=SAVE_PRINT&');
				} else {
					postString += escape(form.elements[i].name)+'='+escape(form.elements[i].value)+'&';
					Zotero.debug("postString+= "+form.elements[i].name+'='+form.elements[i].value+'&');
				}
			}
		}
		postString+="selectionRows=2&selectionFormat=5&pageSize=15";
	}
	var responseCharset = 'UTF-8';
	var Headers=new Object();
	Headers.Referer=url;
	Zotero.debug("newUri: "+newUri);
	
	var found=false;	
	Zotero.Utilities.HTTP.doPost(newUri,postString, function(text) {
		// load translator for MARC
		//Zotero.debug(text);
		if (detectedWeb=="book") {
			var records = text.split("\x1D");
			var searchCode=String.fromCharCode(0x1e)+currentId+String.fromCharCode(0x1e);

			for each (var record in records) {
				if (record.indexOf(searchCode)>0) {
					Zotero.debug(record);
					text=record+"\x1d";
					found=true;
					break;
				}
			}
			if (!found) {
				doc.defaultView.alert("اتصال قبلی به سرور قطع شده است") ;
				return;
			}
		}
				

		found=true;
		var marc = Zotero.loadTranslator("import");
		//marc.setTranslator("a6ee60df-1ddc-4aae-bb25-45e0537be973");
		marc.setTranslator("0dc5fbe8-f6b0-46e4-aafb-73b3a75c7e59"); //IRANMARC
		marc.setString(text);
		
		var domain = url.match(/https?:\/\/([^/]+)/);
		marc.setHandler("itemDone", function(obj, item) {
			Zotero.debug(item);
			item.repository = domain[1]+" Library Catalog";
			item.complete();
			Zotero.debug(item);
		});
		

		marc.translate();

		
		Zotero.done();
	}, Headers,responseCharset);
	if (found) Zotero.wait();

}