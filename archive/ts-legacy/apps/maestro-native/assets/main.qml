import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import Maestro.Components 1.0

ApplicationWindow {
    visible: true
    width: 1200
    height: 800
    title: "Maestro Native (HyperCode)"
    color: "#1e1e1e"

    RowLayout {
        anchors.fill: parent
        spacing: 0

        // Sidebar
        Rectangle {
            Layout.fillHeight: true
            Layout.preferredWidth: 250
            color: "#121212"

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 10
                spacing: 15

                Text {
                    text: "SESSIONS"
                    color: "#555"
                    font.bold: true
                    font.pixelSize: 12
                }

                ListView {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    model: ["Core Session", "Web UI Refactor", "Go Porting", "Native Terminal Bridge"]
                    delegate: ItemDelegate {
                        width: parent.width
                        text: modelData
                        contentItem: Text {
                            text: modelData
                            color: "#ccc"
                            verticalAlignment: Text.AlignVCenter
                        }
                    }
                }
            }
        }

        // Divider
        Rectangle {
            Layout.fillHeight: true
            Layout.preferredWidth: 1
            color: "#333"
        }

        // Main Content
        ColumnLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: 0

            // Chat/Terminal Tabs
            TabBar {
                id: bar
                Layout.fillWidth: true
                background: Rectangle { color: "#1e1e1e" }

                TabButton {
                    text: "Chat"
                    contentItem: Text {
                        text: parent.text
                        color: parent.checked ? "white" : "#888"
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
                TabButton {
                    text: "Terminal"
                    contentItem: Text {
                        text: parent.text
                        color: parent.checked ? "white" : "#888"
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
            }

            StackLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                currentIndex: bar.currentIndex

                // Chat View
                Rectangle {
                    color: "#1e1e1e"
                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 20

                        ScrollView {
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            TextArea {
                                readOnly: true
                                text: "Welcome to Maestro Native.\nHow can I help you today?"
                                color: "#ccc"
                                wrapMode: TextEdit.Wrap
                                background: null
                            }
                        }

                        TextField {
                            Layout.fillWidth: true
                            placeholderText: "Type a message..."
                            color: "white"
                            background: Rectangle {
                                color: "#2d2d2d"
                                radius: 4
                            }
                        }
                    }
                }

                // Terminal View (using bobui's OmniTerminal)
                Rectangle {
                    color: "black"
                    
                    OmniTerminal {
                        id: nativeTerminal
                        anchors.fill: parent
                        anchors.margins: 5
                        backgroundColor: "#000000"
                        textColor: "#00ff00"
                        
                        Component.onCompleted: {
                            // Boot sequence simulation
                            writeCommand("echo 'HyperCode OmniTerminal Boot Sequence Initiated...'\n")
                            writeCommand("hypercode status\n")
                            writeCommand("hypercode mcp list\n")
                        }
                        
                        onOutputReceived: function(text) {
                            console.log("[OmniTerminal Output]:", text)
                        }
                    }
                }
            }
        }
    }
}
