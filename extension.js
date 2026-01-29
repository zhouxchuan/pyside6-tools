const vscode = require("vscode");
const path = require("path");
const { exec } = require("child_process");
const os = require("os");

/**
 * 激活扩展
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log("PySide6 Tools 扩展已激活");

    // 注册打开 Designer 命令
    let openDesigner = vscode.commands.registerCommand(
        "pyside6.openDesigner",
        async (uri) => {
            try {
                await openInDesigner(uri);
            } catch (error) {
                vscode.window.showErrorMessage(
                    `打开 Designer 失败: ${error.message}`,
                );
            }
        },
    );

    // 注册编译 UI 命令
    let compileUI = vscode.commands.registerCommand(
        "pyside6.compileUI",
        async (uri) => {
            try {
                await compileUIWithUIC(uri);
            } catch (error) {
                vscode.window.showErrorMessage(
                    `编译 UI 失败: ${error.message}`,
                );
            }
        },
    );

    context.subscriptions.push(openDesigner);
    context.subscriptions.push(compileUI);
}

/**
 * 在 PySide6 Designer 中打开 UI 文件
 * @param {vscode.Uri} uri
 */
async function openInDesigner(uri) {
    const filePath = await getUIFilePath(uri);
    if (!filePath) return;

    const designerPath = await getDesignerPath();
    if (!designerPath) {
        vscode.window.showErrorMessage(
            "未找到 pyside6-designer，请确保 PySide6 已正确安装并配置",
        );
        return;
    }

    // 启动 Designer
    const command = `"${designerPath}" "${filePath}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            vscode.window.showErrorMessage(
                `启动 Designer 失败: ${error.message}`,
            );
            console.error("Designer 错误:", error);
            return;
        }
        vscode.window.showInformationMessage("PySide6 Designer 已启动");
    });
}

/**
 * 使用 PySide6 UIC 编译 UI 文件
 * @param {vscode.Uri} uri
 */
async function compileUIWithUIC(uri) {
    const filePath = await getUIFilePath(uri);
    if (!filePath) return;

    const uicPath = await getUICPath();
    if (!uicPath) {
        vscode.window.showErrorMessage(
            "未找到 pyside6-uic，请确保 PySide6 已正确安装并配置",
        );
        return;
    }

    // 获取配置的输出后缀
    const config = vscode.workspace.getConfiguration("pyside6");
    const outputSuffix = config.get("outputSuffix") || "_ui";

    // 生成输出文件名
    const fileDir = path.dirname(filePath);
    const fileName = path.basename(filePath, ".ui");
    const outputPath = path.join(fileDir, `${fileName}${outputSuffix}.py`);

    // 执行编译命令
    const command = `"${uicPath}" "${filePath}" -o "${outputPath}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            vscode.window.showErrorMessage(`编译失败: ${error.message}`);
            console.error("编译错误:", error);
            return;
        }

        vscode.window.showInformationMessage(
            `UI 文件已编译: ${path.basename(outputPath)}`,
        );

        // 打开编译后的文件
        vscode.workspace.openTextDocument(outputPath).then((doc) => {
            vscode.window.showTextDocument(doc);
        });
    });
}

/**
 * 获取 UI 文件路径
 * @param {vscode.Uri} uri
 * @returns {Promise<string|undefined>}
 */
async function getUIFilePath(uri) {
    let filePath;

    if (uri && uri.fsPath) {
        filePath = uri.fsPath;
    } else {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.fileName.endsWith(".ui")) {
            filePath = activeEditor.document.fileName;
        }
    }

    if (!filePath) {
        vscode.window.showErrorMessage("请先打开或选择一个 .ui 文件");
        return undefined;
    }

    if (!filePath.endsWith(".ui")) {
        vscode.window.showErrorMessage("请选择 .ui 文件");
        return undefined;
    }

    return filePath;
}

/**
 * 检查文件是否存在
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function fileExists(filePath) {
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
async function findInPath(executableName) {
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
    const configuredPath = config.get("designerPath");
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
    const configuredPath = config.get("uicPath");
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

/**
 * 停用扩展
 */
function deactivate() {
    console.log("PySide6 Tools 扩展已停用");
}

module.exports = {
    activate,
    deactivate,
};
