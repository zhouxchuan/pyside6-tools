# PySide6 Tools Extension

A tools for PySide6 Designer (pyside6-designer), UI Compiler (pyside6-uic) and Resource Compiler (pyside6-rcc) on the context menu of vscodefile explorer。

## Features

- **Open in PySide6 Designer**: Open a .ui file in pySide6-designer
- **Compile UI with PySide6 UIC**: Compile a .ui file with pyside6-uic
- **Compile Resource with PySide6 RCC**: Compile a .qrc file with pyside6-rcc
- **Auto Compile UI**: Automatically compile UI files when saved (optional)

## Usage

1. In the file explorer or editor, right-click on a .ui file or .qrc file
2. Select "PySide6 Designer" or "Compile UI with PySide6 UIC" or "Compile Resource with PySide6 RCC" menu
3. Select the desired feature

## Auto Compile

To enable auto-compile feature:

1. Open VS Code settings (Ctrl+,)
2. Search for "PySide6 Tools"
3. Enable "Auto Compile" option

## Configuration

You can configure PySide6 Tools in VSCode settings:

- `pyside6.designerPath`: Path to pyside6-designer executable (optional, extension will try to find it automatically)
- `pyside6.uicPath`: Path to pyside6-uic executable (optional, extension will try to find it automatically)
- `pyside6.uicOutputSuffix`: Suffix for compiled UI files (default: \_ui)
- `pyside6.rccOutputSuffix`: Suffix for compiled RCC files (default: \_rc)
- `pyside6.autoCompile`: Automatically compile UI files when saved (default: false)

## Requirements

- PySide6 is installed and available
- VSCode 1.60.0 or higher version
- Python 3.7 or higher version

## Author

- Zhou Xiaochuan

## License

MIT License
