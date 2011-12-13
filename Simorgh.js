{
        "translatorID": "6493fde0-1775-414f-a1b8-dd529258036b",
        "label": "Simorgh",
        "creator": "CRCIS",
        "target": "simwebclt/WebAccess/SimWebPortal.dll/Dub",
        "minVersion": "1.0",
        "maxVersion": "",
        "priority": 100,
        "inRepository": true,
        "translatorType": 4,
        "lastUpdated": "2011-08-06 19:35:52"
}

//<abszh>
function detectWeb(doc, url)  {
	var result=false;	
	if (url.match(/\/simwebclt\/Webaccess\/SimWebPortal.dll\/DubSrch/i)) {
		result="multiple";
	} else if (url.match(/\/simwebclt\/WebAccess\/SimWebPortal.dll\/DubFullRec/)) {
		var XPath1="/html/body/table[3]/tbody/tr[3]/td[2]/div/form/div/table[2]/tbody/tr/td[3]/table/tbody/tr/td[1]";
		var XPath2="/html/body/table[3]/tbody/tr[3]/td[2]/div/form/div/table[2]/tbody/tr/td[3]/table/tbody/tr/td[2]";
		result=detectItemType(doc,url,XPath1,XPath2);
	}
	return result;
}




function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
	if (prefix == 'x') return namespace; else return null;
	} : null;
	

	var items = new Object();
	var nextTitle;

	
	
	if (detectWeb(doc, url) == "multiple") {
		//for multiple items I send a print request to the server and then
		//insert the generated print page into a hidden div (id=abszhDiv) in the document 
		//then scrape the hidden div contents
		//I tried new XML(text)  
		//but it did not work apparently because of not well-formed tags
		//normally a print request is sent in two steps 
		//(first page for selecting the items and second page for selecting the fields)
		//but with proper post data server can be fooled
		
		var availableItems = new Object();
		var itemCodes=new Object();
		var XPath1='//span[@class="TRecTitle"]';//used for scraping titles
		var XPath2='//input[@class="TSelectCheckBox"]/@cacheindex';//used for scanning checkboxes
		var theXPathObject1=doc.evaluate(XPath1,doc,nsResolver, XPathResult.ANY_TYPE, null);
		var theXPathObject2=doc.evaluate(XPath2,doc,nsResolver, XPathResult.ANY_TYPE, null);
		var td1;
		var td2;
		var n=0;
		while (td1=theXPathObject1.iterateNext()) {
			td2=theXPathObject2.iterateNext();
			availableItems[n]=td1.textContent;
			itemCodes[n]=td2.textContent;
			Zotero.debug("checkbox code: "+itemCodes[n]);
			n++;
		}
		var items = Zotero.selectItems(availableItems);
		if(!items) {
			return true;
		}
		var str1="";
		var selectedCodes=new Array();
		for (var i in items) {
			selectedCodes.push(Number(itemCodes[i])+1);
		}
		str1=selectedCodes.join("%2C");
		//0x2C is ascii code of comma
		//str1 contains indexes of selected items and 
		//will be appended to post string and 
		//tells the server which items should be printed
		Zotero.debug("selected items' codes: "+str1);
		

		//extract required data from hidden fields of the form (seesionId, ... )
		var form=doc.forms[0];
		var sessionId;
		var hIndex;
		var cacheIndex;
		var sIndex;
		var eIndex;
		for(var i=0; i<form.elements.length; i++) {
			if(form.elements[i].type && form.elements[i].type.toLowerCase() == 'hidden') {
				if (form.elements[i].name.toLowerCase()=="sessionid") {
					sessionId=escape(form.elements[i].value);
				} else if (form.elements[i].name.toLowerCase()=="hindex") {
					hIndex=escape(form.elements[i].value);
				} else if (form.elements[i].name.toLowerCase()=="cacheindex") {
					cacheIndex=escape(form.elements[i].value);
				} else if (form.elements[i].name.toLowerCase()=="sindex") {
					sIndex=escape(form.elements[i].value);
				} else if (form.elements[i].name.toLowerCase()=="eindex") {
					eIndex=escape(form.elements[i].value);
				}
			}
		}
		
		//make URL to send a print request for selected items 
		var newUri=url.replace("DubSrch","Print");

		
		postString="SPN=PRNDLG&DPN=PRINT&LANG=0&SESSIONID="+sessionId;
		postString+="&SNAME=&DBID=0&";
		postString+="HINDEX="+hIndex;
		postString+="&CACHEINDEX="+cacheIndex;
		postString+="&SINDEX="+sIndex;
		postString+="&EINDEX="+eIndex;
		postString+="&SORTCB=1&NumRangeIL="+str1;
		postString+="&ItemDescriptionCB=on&ItemFileNameCB=on&ItemFileSizeCB=on&ItemKindCB=on&TitleCB=on&CreatorCB=on&SubjectCB=on&DescriptionCB=on&PublisherCB=on&ContributorCB=on&DateCB=on&FormatCB=on&CallNumberCB=on&ISBNCB=on&SourceCB=on&RelationCB=on&CoverageCB=on&RightsCB=on&TypeCB=on&LanguageCB=on&SepKindRB=0";
		var responseCharset = 'UTF-8';
		var Headers=new Object();
		Headers.Referer=url;
		
		Zotero.debug("postString: "+postString);
		//send print request, get the response and process it by scrapeMultiple
		Zotero.Utilities.HTTP.doPost(newUri,postString, function(text) {
			if (text.match(/id=MessageDiv/)) {
			//unfortunately alert is forbidden
			//doc.defaultView.alert("اتصال قبلی به سرور قطع شده است") ;
				return true;
			}
				
			
			text = text.replace(/<HEAD>[\s\S]*<\/HEAD>/, "");
			text=text.replace(/<.BODY>/gi,'');
			
			Zotero.debug("server response received");			
			insertIntoDiv(doc,text);
			
			//var newDoc=document.open();
			//var bak=doc.documentElement.innerHTML;
			//doc.documentElement.innerHTML=text;
			
			//var newDoc=new XML(text);
			//Zotero.debug("newDoc: "+doc.documentElement.innerHTML);
			scrapeMultiple(doc,url);
			Zotero.done();	
			//doc.documentElement.innerHTML=bak;
		},Headers,responseCharset);
		
		
	} else {
		scrapeSingle(doc,url);
		Zotero.done();
	}
	Zotero.wait();
}

function detectItemType(doc,url,XPath1,XPath2) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;

	var theXPathObject1=doc.evaluate(XPath1,doc,nsResolver, XPathResult.ANY_TYPE, null);
	var theXPathObject2=doc.evaluate(XPath2,doc,nsResolver, XPathResult.ANY_TYPE, null);
	var itemType="";
	var td1;
	var td2;
	while (td1=theXPathObject1.iterateNext()) {
		td2=theXPathObject2.iterateNext();
		if (!td2) break;
		var td1Text=td1.textContent;
		var td2Text=td2.textContent;
		if (td1Text.match(/(نوع)|(type)/i))  itemType=td2Text.toLowerCase();
	}
	Zotero.debug("itemType is: "+itemType);

	
	if (!itemType.match(/[^a-z]/)) {
		result=itemType;
	} else if (itemType.match("کتاب")) {
		result="book";
	} else if (itemType.match("پايان نامه")) {
		result="thesis";
	}else if (itemType.match("گزارش")) {
		result="report";
	} else if (itemType.match("مقاله")) {
		result="article";
	} else {
		result=false;
	}
	return result;
}



function scrapeMultiple(doc,url) {
	Zotero.debug("scrapeMultiple");
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
	if (prefix == 'x') return namespace; else return null;
	} : null;


	
	var XPath0='/html/body/div[@id="abszhDiv"]/table';
	var theXPathObject0=doc.evaluate(XPath0,doc,nsResolver, XPathResult.ANY_TYPE, null);
	var tableNumber=1;
	//skip first table (contains just some description about page contents)
	Zotero.debug("tableNumber: ",tableNumber);	
	var table=theXPathObject0.iterateNext();	
	while (table=theXPathObject0.iterateNext()) {
		tableNumber++;
		Zotero.debug("tableNumber: ",tableNumber);		
		//make XPaths and pass them to scrape routine
		var XPath1='/html/body/div[@id="abszhDiv"]/table['+tableNumber.toString()+']/tbody/tr[count(*)>1]/td[1]';
		var XPath2='/html/body/div[@id="abszhDiv"]/table['+tableNumber.toString()+']/tbody/tr[count(*)>1]/td[2]';
		scrape(doc,url,XPath1,XPath2);
	}
	
}



function scrapeSingle(doc,url) {
	Zotero.debug("scrapeSingle");
	//make XPaths and call scrape
	var XPath1="/html/body/table[3]/tbody/tr[3]/td[2]/div/form/div/table[2]/tbody/tr/td[3]/table/tbody/tr/td[1]";
	var XPath2="/html/body/table[3]/tbody/tr[3]/td[2]/div/form/div/table[2]/tbody/tr/td[3]/table/tbody/tr/td[2]";
	scrape(doc,url,XPath1,XPath2);
}
	

//XPath1: XPath to labels ("Title:", "Author:","Publisher:", ...)
//XPath2: XPath to contents ("Story of Civilization","Durant, Will",...)
function scrape(doc,url,XPath1,XPath2) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
	if (prefix == 'x') return namespace; else return null;
	} : null;

	Zotero.debug("here");
	var itemType=detectItemType(doc,url,XPath1,XPath2);		
	var newItem = new Zotero.Item(itemType);
	newItem.url = doc.location.href;
	var td1;
	var td2;
	
	var theXPathObject1=doc.evaluate(XPath1,doc,nsResolver, XPathResult.ANY_TYPE, null);
	var theXPathObject2=doc.evaluate(XPath2,doc,nsResolver, XPathResult.ANY_TYPE, null);
	
	
	while (td1=theXPathObject1.iterateNext()) {
		td2=theXPathObject2.iterateNext();
		if (!td2) break;
		var td1Text=td1.textContent;
		var td2Text=td2.textContent;
		Zotero.debug("td1Text: "+td1Text);
		Zotero.debug("td2Text: "+td2Text);
		if (td1Text.match(/(عنوان)|(title)/i)) {
			newItem.title=td2Text;
			Zotero.debug("title: "+td2Text);
		} else if (td1Text.match(/(پديدآور اصلى)|(creator)/i)) {
			var authorText = abszhClean(td2Text.replace(/\u060C/g,','));
			Zotero.debug("authorText: "+authorText);
			newItem.creators.push(Zotero.Utilities.cleanAuthor(authorText, "author",true));
		} else if (td1Text.match(/(ساير پديدآوران)|(contributor)/i)) {
			var authorsArray=td2Text.split("//");
			for (var jj in authorsArray) {
				var authorText = abszhClean(authorsArray[jj].replace(/\u060C/g,','));
				newItem.creators.push(Zotero.Utilities.cleanAuthor(authorText, "contributor",true));
			}
		} else if (td1Text.match(/(ناشر)|(publisher)/i)) {
			newItem.publisher=td2Text;
		} else if (td1Text.match(/(تاريخ اثر)|(date)/i)) {
			newItem.date=pullNumber(td2Text);
		} else if (td1Text.match(/(مشخصه ظاهرى)|(format)/i)) {
			newItem.extra=td2Text;
		} else if (td1Text.match(/(شماره بازيابى)|(call number)/i)) {
			newItem.callNumber=td2Text;
		} else if (td1Text.match(/(زبان اثر)|(language)/i)) {
			if (td2Text.match("فارسى")) {
				newItem.language="fa";
			} else if (td2Text.match("عربى")) {
				newItem.language="ar";
			} else if (td2Text.match(/latin/i)) {
				newItem.language="en";
			}
		} else if (td1Text.match(/(شابک)|(ISBN)/i)) {
			newItem.ISBN=td2Text;
		}
	}
	newItem.complete();
	Zotero.debug("newItem: "+newItem);
}


function insertIntoDiv(doc,text) {
	Zotero.debug("inserting");
	var div = doc.getElementById("abszhDiv");
	if (!div) {
		
		div = doc.createElement("div");
		div.setAttribute("id", "abszhDiv");
		div.setAttribute("name", "abszhDiv");
		div.setAttribute("type", "content");
		div.setAttribute("collapsed", "true");
		body=doc.getElementsByTagName("body")[0];
		body.appendChild(div);
	}
	div.style.display='none';
	div.innerHTML=text;
}


function pullNumber(text) {
	//convert persian and arabic numbers to latin digits
	var ntext='';
	for (var i=0; i<text.length; i++) {
		if ((text.charCodeAt(i)>=0x06F0) && (text.charCodeAt(i)<=0x06F9)) { 
			ntext+=String.fromCharCode(text.charCodeAt(i)-0x06F0+48);
		} else if ((text.charCodeAt(i)>=0x0660) && (text.charCodeAt(i)<=0x0669)) {
			ntext+=String.fromCharCode(text.charCodeAt(i)-0x0660+48);
		} else {
			ntext+=text[i];
		}
	}
	text=ntext;

	var pullRe = /[0-9]+/;
	var m = pullRe.exec(text);
	if(m) {
		return m[0];
	}
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