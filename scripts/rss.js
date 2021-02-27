// GET /r/*/top/.rss
let defaultSubreddits = ["Amd", "AskScience", "aww", "battlestations", "BrandonSanderson", "electronics", "Pokemon", "HermitCraft", "HermitChat", "HomeLab", "LinusTechTips", "lotr", "Minecraft", "pokemongo", "PrequelMemes", "raspberry_pi", "skyrim", "Spanish", "Stormlight_Archive"];
// GET /user/*/.rss
let defaultRedditUsers = ["mistborn", "quippedtheraven"];
// GET /domain/*/top/.rss
let defaultDomains = ["AnandTech.com", "newegg.com"];
// GET url
let comicSites = ["https://xkcd.com/rss.xml", "https://www.smbc-comics.com/comic/rss"];

let entryObjects = [];
let nextIndexToWrite = 0;

function onClick() {
    let spinner = document.getElementById('spinner');
    spinner.removeAttribute('hidden');
    spinner.style.width = '50px';
    spinner.style.margin = '15px auto';
    document.getElementById('exec').style.visibility = 'hidden';

    let promiseArray = [];
    promiseArray.push.apply(promiseArray, loadSubredditRSS());
    // promiseArray.push.apply(promiseArray, loadRedditUserRSS());
    // promiseArray.push.apply(promiseArray, loadRedditDomainsRSS());
    // promiseArray.push.apply(promiseArray, loadComicRSS()); 

    Promise.allSettled(promiseArray)
    .then( () => {
        entryObjects.sort( (a, b) => { return (a.pubDate < b.pubDate) - (a.pubDate > b.pubDate); });
    }).then( () => {
        spinner.setAttribute('hidden', 'true');
        writeMoreEntries();
    });
}
document.getElementById('exec').addEventListener('click', onClick);

window.onscroll = function(ev) {
    if ((window.innerHeight + window.scrollY) >= document.body.scrollHeight) {
        writeMoreEntries();
    }
};

function writeMoreEntries() {
    let numToWrite = (nextIndexToWrite + 50 < entryObjects.length) ? 50 : entryObjects.length - nextIndexToWrite - 1;
    writeEntriesToHTML(entryObjects.slice(nextIndexToWrite, nextIndexToWrite + numToWrite));
    nextIndexToWrite += numToWrite;
}

/*
    Write the entry objects to the HTML page
*/
function writeEntriesToHTML(entries) {
    if (entries.length == 0) { return; }
    let html = ""; // base node
    for (let entry of entries) {
        switch (entry.type) {
            case 'comic':
                html += writeComicEntryToHTML(entry);
                break;
            case 'user':
                html += writeUserEntryToHTML(entry);
                break;
            case 'subreddit':
                html += writeSubredditEntryToHTML(entry);
                break;
            default:
                console.log("Unknown type in writeEntriesToHTML()");
                break;
        }
    }
    document.getElementById("displayRSS").innerHTML += html
}

/*
    Comic RSS Code
*/
function loadComicRSS() {
    let promiseArray = [];

    for (let comic of comicSites) {
        let url = "https://jsonp.afeld.me/?url=" + comic;
        promiseArray.push(fetch(url)
                            .then(response => response.text())
                            .then(xml => addComicEntries(xml)))
    }
    
    return promiseArray
}

function addComicEntries(xmlString) {
    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(xmlString, "text/xml");

    let entryList = xmlDoc.getElementsByTagName('item');

    for (let entry of entryList) {
        let link = entry.getElementsByTagName("link")[0].childNodes[0].nodeValue;
        let title = entry.getElementsByTagName("title")[0].childNodes[0].nodeValue;
        let content = entry.getElementsByTagName('description')[0].childNodes[0].nodeValue; 
        let pubDate = entry.getElementsByTagName('pubDate')[0].childNodes[0].nodeValue;

        let comicObject = {'link': link, 'title': title, 'content': content, 'pubDate': new Date(pubDate), 'type': 'comic'};
        entryObjects.push(comicObject);
    }
}

function writeComicEntryToHTML(entry) {
    let link = entry.link;
    let title = entry.title;
    let content = entry.content;

    let html = `<div class='entry'><a href='${link}'><h2>${title}</h2></a>${content}</div>`;
    return html;
}

/*
    Domain RSS Code
*/
function loadRedditDomainsRSS() {
    let promiseArray = [];
    for (let domain of defaultDomains) {
        let baseUrl = "https://jsonp.afeld.me/?url=https://www.reddit.com/domain/";
        let url = baseUrl + domain + "/top/.rss";

        promiseArray.push(fetch(url)
                            .then(response => response.text())
                            .then(xml => addSubredditEntries(xml)))
    }
    
    return promiseArray;
}

function addSubredditEntries(xmlString) {
    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(xmlString, "text/xml");

    let entryList = xmlDoc.getElementsByTagName('entry');

    for (let entry of entryList) {
        let link = entry.getElementsByTagName("link")[0].getAttribute('href');

        let title = entry.getElementsByTagName("title")[0].childNodes[0].nodeValue;

        let author = entry.getElementsByTagName('author');
        author = author.length > 0 ? author[0].getElementsByTagName('name')[0].firstChild.nodeValue : "/u/[deleted]";
        let authorLink = "https://www.reddit.com" + author;

        let content = entry.getElementsByTagName('content')[0].childNodes[0].nodeValue;

        let pubDate = entry.getElementsByTagName('updated')[0].childNodes[0].nodeValue;

        let domainObject = {'link': link, 'author': author, 'authorLink': authorLink, 'title': title, 'content': content, 'pubDate': new Date(pubDate), 'type': 'subreddit'};
        entryObjects.push(domainObject);
    }
}

function writeSubredditEntryToHTML(entry) {
    let link = entry.link;
    let title = entry.title;
    let authorLink = entry.authorLink
    let author = entry.author;
    let content = entry.content;

    let html = `<div class='entry'><a href='${link}'><h2>${title}</h2></a>${content}</div>`;
    return html;
}


/*
    User RSS Code
*/
function loadRedditUserRSS() {
    let promiseArray = [];
    for (let user of defaultRedditUsers) {
        let baseUrl = "https://jsonp.afeld.me/?url=https://www.reddit.com/user/";
        let url = baseUrl + user + "/.rss";

        promiseArray.push(fetch(url)
                            .then(response => response.text())
                            .then(xml => addUserEntries(xml)))
    }
    
    return promiseArray;
}

function addUserEntries(xmlString) {
    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(xmlString, "text/xml");

    let entryList = xmlDoc.getElementsByTagName('entry');

    for (let entry of entryList) {
        let link = entry.getElementsByTagName("link")[0].getAttribute('href');

        let image = entry.getElementsByTagName('media:thumbnail');
        image = image.length > 0 ? image[0].getAttribute('url') : "";

        let title = entry.getElementsByTagName("title")[0].childNodes[0].nodeValue;

        let author = entry.getElementsByTagName('author');
        author = author.length > 0 ? author[0].getElementsByTagName('name')[0].firstChild.nodeValue : "/u/[deleted]";
        let authorLink = "https://www.reddit.com" + author;

        let content = entry.getElementsByTagName('content')[0].childNodes[0].nodeValue;

        let pubDate = entry.getElementsByTagName('updated')[0].childNodes[0].nodeValue;

        let userObject = {'link': link, 'image': image, 'author': author, 'authorLink': authorLink, 'title': title, 'content': content,'pubDate': new Date(pubDate), 'type': 'user'};
        entryObjects.push(userObject);
    }
}

function writeUserEntryToHTML(entry) {
    let link = entry.link;
    let image = entry.image;
    let title = entry.title;
    let author = entry.author;
    let authorLink = entry.authorLink;
    let content = entry.content;

    let html = `<div class='entry'><a href='${link}'><h2>${title}</h2></a><h4><a href='${authorLink}'>${author}</a></h4><img src='${image}'/>${content}</div>`;
    return html;
}


/* 
    Subreddit RSS Code
*/
function loadSubredditRSS() {
    let promiseArray = [];
    for (let subreddit of defaultSubreddits) {
        let baseUrl = "https://jsonp.afeld.me/?url=https://www.reddit.com/r/";
        let url = baseUrl + subreddit + "/top/.rss";


        promiseArray.push(fetch(url)
                            .then(response => response.text())
                            .then(xml => addSubredditEntries(xml)));
    }

    return promiseArray;
}