import * as vscode from 'vscode';
import * as tagsList from './tags.json';

type decorationWithText = { deco: vscode.DecorationOptions; text: string };
type colorsConfig = {
    asterisks: string;
    bracesAndPipes: string;
    tags: string;
    content: string;
    sources: string;
};

export function activate(context: vscode.ExtensionContext) {
    let timeout: NodeJS.Timer | undefined = undefined;

    let colors = vscode.workspace.getConfiguration().get<colorsConfig>('colors');

    const languages = vscode.workspace.getConfiguration().get<string[]>('languageIDs');

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

    let activeEditor = vscode.window.activeTextEditor;

    function updateDecorations() {
        if (!activeEditor) {
            return;
        }

        if (languages && !languages.includes(activeEditor.document.languageId)) {
            return;
        }

        const text = activeEditor.document.getText();

        const matches: decorationWithText[] = [];
        for (const atTag of tagsList) {
            const tagRegEx = new RegExp(`\\{${atTag}[^}]*\\}\\**`, 'g');
            let match = undefined;
            while ((match = tagRegEx.exec(text))) {
                const startPos = activeEditor.document.positionAt(match.index);
                const endPos = activeEditor.document.positionAt(match.index + match[0].length);
                const range = { range: new vscode.Range(startPos, endPos) };
                matches.push({ deco: range, text: match[0] });
            }
        }

        const asterisks = matchStuff(matches, /(\*)+/g);
        const bracesAndPipes = matchStuff(matches, /\{|\||\}/g);
        const tags = matchStuff(matches, /@[a-z|A-Z]*/g);
        const content = matchStuff(matches, /(?<=@[a-z|A-Z]*\s)[^|^}]*/g);
        const sources = matchStuff(matches, /(?<=\|)[^}|^|]*/g);

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

    vscode.window.onDidChangeActiveTextEditor(
        (editor) => {
            activeEditor = editor;
            if (editor) {
                triggerUpdateDecorations();
            }
        },
        null,
        context.subscriptions
    );

    vscode.workspace.onDidChangeTextDocument(
        (event) => {
            if (activeEditor && event.document === activeEditor.document) {
                triggerUpdateDecorations();
            }
        },
        null,
        context.subscriptions
    );
}

function createType(color: string, args?: Record<string, unknown>) {
    return vscode.window.createTextEditorDecorationType({
        color: color,
        ...args,
    });
}

function matchStuff(matches: decorationWithText[], regex: RegExp) {
    const arr: vscode.DecorationOptions[] = [];
    matches.forEach((match) => {
        let temp = undefined;
        while ((temp = regex.exec(match.text)))
            arr.push({
                range: new vscode.Range(
                    match.deco.range.start.translate(undefined, temp.index),
                    match.deco.range.start.translate(undefined, temp.index + temp[0].length)
                ),
            });
    });
    return arr;
}
