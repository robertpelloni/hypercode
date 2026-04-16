#include <QApplication>
#include <QLabel>
// #include <QQmlApplicationEngine>
// #include <QQmlContext>
// #include "../../bobui/OmniUI/omnicore/include/OmniTerminal.h"

int main(int argc, char *argv[])
{
    QApplication app(argc, argv);

    // QML components disabled until 'bobui' compiles QtDeclarative.
    // qmlRegisterType<OmniTerminal>("Maestro.Components", 1, 0, "OmniTerminal");
    // QQmlApplicationEngine engine;
    // const QUrl url(QStringLiteral("qrc:/Maestro/assets/main.qml"));
    // engine.load(url);

    QLabel label("Maestro Native (HyperCode) initialized via bobui Qt6 fork!");
    label.resize(800, 600);
    label.show();

    return app.exec();
}
