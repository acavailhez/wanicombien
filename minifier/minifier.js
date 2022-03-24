var UglifyJS = require("uglify-js");
var uglifycss = require('uglifycss');
const fs = require("fs");
const Path = require("path");
var md5 = require('md5');

// var code = "function add(first, second) { return first + second; }";
// var result = UglifyJS.minify(code);
// console.log(result.error); // runtime error, or `undefined` if no error
// console.log(result.code);  // minified output: function add(n,d){return n+d}

const JAVASCRIPT_MINIFIED_INSERT_TAG = "JAVASCRIPT_GOES_HERE";
const CSS_MINIFIED_INSERT_TAG = "CSS_GOES_HERE";

async function minify(
    indexPath, // The index.html to minify
    buildFolderPath, // The destination folder
) {
    const indexFolder = Path.dirname(indexPath);

    if (fs.existsSync(buildFolderPath)) {
        deleteFolder(buildFolderPath);
    }
    fs.mkdirSync(buildFolderPath);

    // For a html line in index.html, load the file referenced if matching the regex
    // nil otherwise
    async function getReferencedFile(
        line, // The code line in index.html
        regex, // The regex to use eg /<script src="([^"]*)"/
    ) {
        const match = line.match(regex);
        if (!match) {
            return null;
        }
        const relativePath = match[1];
        const path = Path.resolve(indexFolder, relativePath);
        const file = await fs.promises.readFile(path, 'utf8');
        return file;
    }

    const indexContent = await fs.promises.readFile(indexPath, 'utf8');

    let javascript = "";
    let css = "";
    let minifiedHtml = "";
    for await (const rawLine of indexContent.split('\n')) {
        const line = rawLine.trim();
        if (line === "") continue;
        if (line.startsWith("<!--")) continue;
        const jsFile = await getReferencedFile(line, /<script src="([^"]*)"/);
        const cssFile = await getReferencedFile(line, /<link href="([^"]*)" rel="stylesheet">/);
        if (jsFile) {
            javascript += jsFile;
            if (!minifiedHtml.includes(JAVASCRIPT_MINIFIED_INSERT_TAG)) {
                minifiedHtml += `${JAVASCRIPT_MINIFIED_INSERT_TAG}\n`;
            }
        } else if (cssFile) {
            css += cssFile;
            if (!minifiedHtml.includes(CSS_MINIFIED_INSERT_TAG)) {
                minifiedHtml += `${CSS_MINIFIED_INSERT_TAG}\n`;
            }
        } else {
            minifiedHtml += `${line}\n`;
        }
    }

    console.log("Minify javascript");
    const minifiedJavascriptPath = await saveToMinifiedFile(minifyJavascript(javascript), buildFolderPath, 'js');
    console.log("Minify css");
    const minifiedCssPath = await saveToMinifiedFile(minifyCss(css), buildFolderPath, 'css');

    minifiedHtml = minifiedHtml.replaceAll(JAVASCRIPT_MINIFIED_INSERT_TAG, `<script src="${minifiedJavascriptPath}"></script>`);
    minifiedHtml = minifiedHtml.replaceAll(CSS_MINIFIED_INSERT_TAG, `<link href="${minifiedCssPath}" rel="stylesheet">`);
    const minifiedHtmlPath = Path.resolve(buildFolderPath, 'index.html');
    await fs.promises.writeFile(minifiedHtmlPath, minifiedHtml);

    console.log("All done");
}

function minifyJavascript(javascript) {
    var result = UglifyJS.minify(javascript);
    if (result.error) {
        throw result.error;
    }
    return result.code;
}

function minifyCss(css) {
    var result = uglifycss.processString(
        css,
        {maxLineLen: 500, expandVars: true}
    );
    return result;
}

async function saveToMinifiedFile(
    content,
    folder,
    extension, // eg 'js' or 'css'
) {
    const md5Name = md5(content);
    const filename = `${md5Name}.${extension}`;
    const path = Path.resolve(folder, filename);
    await fs.promises.writeFile(path, content);
    return filename;
}

// https://stackoverflow.com/questions/31917891/node-how-to-remove-a-directory-if-exists
var deleteFolder = function (dir) {
    var list = fs.readdirSync(dir);
    for (var i = 0; i < list.length; i++) {
        var filename = Path.join(dir, list[i]);
        var stat = fs.statSync(filename);

        if (filename == "." || filename == "..") {
            // pass these files
        } else if (stat.isDirectory()) {
            // rmdir recursively
            rmdir(filename);
        } else {
            // rm fiilename
            fs.unlinkSync(filename);
        }
    }
    fs.rmdirSync(dir);
};

exports.minify = minify;
