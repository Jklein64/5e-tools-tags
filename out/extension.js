"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode = require("vscode");
const tagsList = require("./tags.json");
function activate(context) {
    var _a, _b;
    let timeout = undefined;
    let colors = vscode.workspace.getConfiguration().get('5e-tools-tags.colors');
    const { open: openBracketConfig, close: closeBracketConfig, } = (_a = vscode.workspace
        .getConfiguration()
        .get('5e-tools-tags.brackets')) !== null && _a !== void 0 ? _a : {
        open: ['{'],
        close: ['}'],
    };
    const languages = vscode.workspace
        .getConfiguration()
        .get('5e-tools-tags.languageIDs');
    const extensions = (_b = vscode.workspace
        .getConfiguration()
        .get('5e-tools-tags.extensions')) !== null && _b !== void 0 ? _b : ['.json'];
    if (!colors)
        colors = {
            asterisks: '#56B6C2',
            bracesAndPipes: '#ABB2BF',
            tags: '#C678DD',
            content: '#E5C07B',
            sources: '#61AFEF',
        };
    const tagType = createType(colors.tags);
    const braceOrPipeType = createType(colors.bracesAndPipes);
    const contentType = createType(colors.content);
    const sourceType = createType(colors.sources);
    const asteriskType = createType(colors.asterisks);
    const tags = tagsList.join('|');
    const openBrackets = openBracketConfig.join('|');
    const closeBrackets = closeBracketConfig.join('|');
    const matchRegEx = new RegExp(`(${openBrackets})(${tags})(\\s|(${closeBrackets}))[^${closeBrackets.replace(/[|\\]/, '')}]*(${closeBrackets})\\**`, 'g');
    const asteriskRegEx = /(\*)+/g;
    const braceOrPipeRegEx = new RegExp(String.raw `(${openBrackets})|\||(${closeBrackets})`, 'g');
    const tagsRegEx = /@[a-z|A-Z|0-9]*/g;
    const contentRegEx = /(?<=@[a-z|A-Z|0-9]*\s)[^|^}]*/g;
    const sourcesRegEx = /(?<=\|)[^}|^|]*/g;
    let activeEditor = vscode.window.activeTextEditor;
    function updateDecorations() {
        if (!activeEditor) {
            return;
        }
        const filename = activeEditor.document.fileName;
        const extension = filename.substring(filename.lastIndexOf('.'));
        if (!extensions.includes(extension)) {
            return;
        }
        // console.log(
        //     `Languages in config: ${languages?.toString()}`,
        //     `language of file: ${activeEditor.document.languageId}`
        // );
        if (languages && !languages.includes(activeEditor.document.languageId)) {
            return;
        }
        const text = activeEditor.document.getText();
        const wholeMatches = [];
        const matches = text.matchAll(matchRegEx);
        for (const match of matches) {
            if (match.index === undefined)
                continue;
            const startPos = activeEditor.document.positionAt(match.index);
            const endPos = activeEditor.document.positionAt(match.index + match[0].length);
            const range = { range: new vscode.Range(startPos, endPos) };
            wholeMatches.push({ deco: range, text: match[0] });
        }
        const asterisks = matchStuff(wholeMatches, asteriskRegEx);
        const bracesAndPipes = matchStuff(wholeMatches, braceOrPipeRegEx);
        const tags = matchStuff(wholeMatches, tagsRegEx);
        const content = matchStuff(wholeMatches, contentRegEx);
        const sources = matchStuff(wholeMatches, sourcesRegEx);
        activeEditor.setDecorations(tagType, tags);
        activeEditor.setDecorations(sourceType, sources);
        activeEditor.setDecorations(braceOrPipeType, bracesAndPipes);
        activeEditor.setDecorations(contentType, content);
        activeEditor.setDecorations(asteriskType, asterisks);
    }
    function triggerUpdateDecorations() {
        if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
        }
        timeout = setTimeout(updateDecorations, 500);
    }
    if (activeEditor) {
        triggerUpdateDecorations();
    }
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        activeEditor = editor;
        if (editor) {
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);
    vscode.workspace.onDidChangeTextDocument((event) => {
        if (activeEditor && event.document === activeEditor.document) {
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);
}
exports.activate = activate;
function createType(color, args) {
    return vscode.window.createTextEditorDecorationType({
        color: color,
        ...args,
    });
}
function matchStuff(matches, regex) {
    const arr = [];
    for (const whole of matches) {
        const subMatches = whole.text.matchAll(regex);
        const matchStart = whole.deco.range.start;
        for (const subMatch of subMatches) {
            if (subMatch.index === undefined)
                continue;
            const startPos = matchStart.translate(undefined, subMatch.index);
            const endPos = matchStart.translate(undefined, subMatch.index + subMatch[0].length);
            arr.push({ range: new vscode.Range(startPos, endPos) });
        }
    }
    return arr;
}
//# sourceMappingURL=extension.js.map