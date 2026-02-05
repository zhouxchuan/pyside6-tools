import * as vscode from "vscode";
import * as path from "path";
import { exec } from "child_process";
import * as os from "os";

/**
 * 激活扩展
 * @param {vscode.ExtensionContext} context
 */
export function activate(context: vscode.ExtensionContext) {
    console.log("PySide6 Tools extension is now active");

    // 注册打开 Designer 命令
    const openDesigner = vscode.commands.registerCommand(
        "pyside6.openDesigner",
        async (uri) => { await openInDesigner(uri); },
    );

    // 注册编译 UI 命令
    const compileUI = vscode.commands.registerCommand(
        "pyside6.compileUI",
        async (uri) => { await compileUIWithUIC(uri); }
    );

    // 注册编译 RCC 命令
    const compileRC = vscode.commands.registerCommand(
        "pyside6.compileRC",
        async (uri) => { await compileRCWithRCC(uri); }
    );

    // 注册文件保存事件监听器，实现自动编译
    const saveListener = vscode.workspace.onDidSaveTextDocument(
        async (document) => {
            // 检查是否是 .ui 文件
            if (document.fileName.endsWith(".ui")) {
                // 检查自动编译配置是否开启
                const config = vscode.workspace.getConfiguration("pyside6");
                const autoCompile = config.get<boolean>("autoCompile");
                if (autoCompile) {
                    await compileUIWithUIC(vscode.Uri.file(document.fileName));
                }
            }
        },
    );

    context.subscriptions.push(openDesigner);
    context.subscriptions.push(compileUI);
    context.subscriptions.push(compileRC);
    context.subscriptions.push(saveListener);
}

/**
 * 停用扩展
 */
export function deactivate() {
    console.log("PySide6 Tools extension deactivated");
}

/**
 * 在 PySide6 Designer 中打开 UI 文件
 * @param {vscode.Uri} uri
 */
async function openInDesigner(uri: vscode.Uri | undefined) {
    const filePath = await getUIFilePath(uri);
    if (!filePath) { return; }

    const designerPath = await getDesignerPath();
    if (!designerPath) {
        vscode.window.showErrorMessage(
            "Failed to find pyside6-designer, please ensure PySide6 is installed and configured correctly",
        );
        return;
    }

    // 启动 Designer
    const command = `"${designerPath}" "${filePath}"`;

    exec(command, (error) => {
        if (error) {
            vscode.window.showErrorMessage(
                `Failed to start Designer: ${error.message}`,
            );
            console.error("Designer error:", error);
            return;
        }
        vscode.window.showInformationMessage("PySide6 Designer is now open");
    });
}

/**
 * 使用 PySide6 UIC 编译 UI 文件
 * @param {vscode.Uri} uri
 */
async function compileUIWithUIC(uri: vscode.Uri | undefined) {
    const filePath = await getUIFilePath(uri);
    if (!filePath) { return; }

    const uicPath = await getUICPath();
    if (!uicPath) {
        vscode.window.showErrorMessage(
            "Failed to find pyside6-uic, please ensure PySide6 is installed and configured correctly",
        );
        return;
    }

    // 获取配置的输出后缀
    const config = vscode.workspace.getConfiguration("pyside6");
    const outputSuffix = config.get<string>("uicOutputSuffix") || "_ui";

    // 生成输出文件名
    const fileDir = path.dirname(filePath);
    const fileName = path.basename(filePath, ".ui");
    const outputPath = path.join(fileDir, `${fileName}${outputSuffix}.py`);

    // 执行编译命令
    const command = `"${uicPath}" "${filePath}" -o "${outputPath}"`;

    exec(command, (error) => {
        if (error) {
            vscode.window.showErrorMessage(
                `Failed to compile UI: ${error.message}`,
            );
            console.error("Compilation error:", error);
            return;
        }

        vscode.window.showInformationMessage(
            `UI file compiled successfully: ${path.basename(outputPath)}`,
        );

        // 打开编译后的文件
        vscode.workspace.openTextDocument(outputPath).then((doc) => {
            vscode.window.showTextDocument(doc);
        });
    });
}

async function compileRCWithRCC(uri: vscode.Uri | undefined) {
    const filePath = await getRCFilePath(uri);
    if (!filePath) { return; }

    const rccPath = await getRCCPath();
    if (!rccPath) {
        vscode.window.showErrorMessage(
            "Failed to find pyside6-rcc, please ensure PySide6 is installed and configured correctly",
        );
        return;
    }

    // 获取配置的输出后缀
    const config = vscode.workspace.getConfiguration("pyside6");
    const outputSuffix = config.get<string>("rccOutputSuffix") || "_rc";

    // 生成输出文件名
    const fileDir = path.dirname(filePath);
    const fileName = path.basename(filePath, ".qrc");
    const outputPath = path.join(fileDir, `${fileName}${outputSuffix}.py`);

    // 执行编译命令
    const command = `"${rccPath}" "${filePath}" -o "${outputPath}"`;

    exec(command, (error) => {
        if (error) {
            vscode.window.showErrorMessage(
                `Failed to compile RC: ${error.message}`,
            );
            console.error("RC Compilation error:", error);
            return;
        }

        vscode.window.showInformationMessage(
            `RC file compiled successfully: ${path.basename(outputPath)}`,
        );

        // 打开编译后的文件
        vscode.workspace.openTextDocument(outputPath).then((doc) => {
            vscode.window.showTextDocument(doc);
        });
    });
}

/**
 * 检查文件是否存在
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function fileExists(filePath: string | undefined) {
    if (!filePath) { return false; }

    try {
        await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
        return true;
    } catch {
        return false;
    }
}

/**
 * 在系统 PATH 中查找可执行文件
 * @param {string} executableName
 * @returns {Promise<string|undefined>}
 */
async function findInPath(executableName: string | undefined) {
    if (!executableName) { return undefined; }

    const pathEnv = process.env.PATH || "";
    const paths = pathEnv.split(path.delimiter);

    for (const p of paths) {
        const fullPath = path.join(p, executableName);
        if (await fileExists(fullPath)) {
            return fullPath;
        }
    }
    return undefined;
}

/**
 * 获取 Designer 路径
 * @returns {Promise<string|undefined>}
 */
async function getDesignerPath() {
    const config = vscode.workspace.getConfiguration("pyside6");

    // 首先检查用户配置的路径
    const configuredPath = config.get<string>("designerPath");
    if (configuredPath && (await fileExists(configuredPath))) {
        return configuredPath;
    }

    // 检查当前工作区的虚拟环境
    if (vscode.workspace.workspaceFolders) {
        const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const venvScriptsPath = path.join(workspacePath, ".venv", "Scripts");
        const designerPath = path.join(
            venvScriptsPath,
            os.platform() === "win32"
                ? "pyside6-designer.exe"
                : "pyside6-designer",
        );

        if (await fileExists(designerPath)) {
            return designerPath;
        }
    }

    // 在系统 PATH 中查找
    const executableName =
        os.platform() === "win32" ? "pyside6-designer.exe" : "pyside6-designer";
    return findInPath(executableName);
}

/**
 * 获取 UIC 路径
 * @returns {Promise<string|undefined>}
 */
async function getUICPath() {
    const config = vscode.workspace.getConfiguration("pyside6");

    // 首先检查用户配置的路径
    const configuredPath = config.get<string>("uicPath");
    if (configuredPath && (await fileExists(configuredPath))) {
        return configuredPath;
    }

    // 检查当前工作区的虚拟环境
    if (vscode.workspace.workspaceFolders) {
        const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const venvScriptsPath = path.join(workspacePath, ".venv", "Scripts");
        const uicPath = path.join(
            venvScriptsPath,
            os.platform() === "win32" ? "pyside6-uic.exe" : "pyside6-uic",
        );

        if (await fileExists(uicPath)) {
            return uicPath;
        }
    }

    // 在系统 PATH 中查找
    const executableName =
        os.platform() === "win32" ? "pyside6-uic.exe" : "pyside6-uic";
    return findInPath(executableName);
}


async function getRCCPath() {
    const config = vscode.workspace.getConfiguration("pyside6");

    // 首先检查用户配置的路径
    const configuredPath = config.get<string>("rccPath");
    if (configuredPath && (await fileExists(configuredPath))) {
        return configuredPath;
    }

    // 检查当前工作区的虚拟环境
    if (vscode.workspace.workspaceFolders) {
        const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const venvScriptsPath = path.join(workspacePath, ".venv", "Scripts");
        const rccPath = path.join(
            venvScriptsPath,
            os.platform() === "win32" ? "pyside6-rcc.exe" : "pyside6-rcc",
        );

        if (await fileExists(rccPath)) {
            return rccPath;
        }
    }

    // 在系统 PATH 中查找
    const executableName =
        os.platform() === "win32" ? "pyside6-rcc.exe" : "pyside6-rcc";
    return findInPath(executableName);
}

/**
 * 获取 UI 文件路径
 * @param {vscode.Uri} uri
 * @returns {Promise<string|undefined>}
 */
async function getUIFilePath(uri: vscode.Uri | undefined) {
    let filePath: string | undefined;
    if (uri && uri.fsPath) {
        filePath = uri.fsPath;
    } else {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.fileName.endsWith(".ui")) {
            filePath = activeEditor.document.fileName;
        }
    }
    if (!filePath) {
        vscode.window.showErrorMessage(
            "Please open or select a .ui file first",
        );
        return undefined;
    }
    if (!filePath.endsWith(".ui")) {
        vscode.window.showErrorMessage("Please select a .ui file");
        return undefined;
    }
    return filePath;
}
/**
 * 获取 RC 文件路径
 * @param {vscode.Uri} uri
 * @returns {Promise<string|undefined>}
 */
async function getRCFilePath(uri: vscode.Uri | undefined) {
    let filePath: string | undefined;
    if (uri && uri.fsPath) {
        filePath = uri.fsPath;
    } else {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.fileName.endsWith(".qrc")) {
            filePath = activeEditor.document.fileName;
        }
    }
    if (!filePath) {
        vscode.window.showErrorMessage(
            "Please open or select a .qrc file first",
        );
        return undefined;
    }
    if (!filePath.endsWith(".qrc")) {
        vscode.window.showErrorMessage("Please select a .qrc file");
        return undefined;
    }
    return filePath;
}