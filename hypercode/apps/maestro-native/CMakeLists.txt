cmake_minimum_required(VERSION 3.16)
project(MaestroNative LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Point to bobui (Qt6 fork)
get_filename_component(BOBUI_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../bobui" ABSOLUTE)

# Include the omnicore headers so we can find OmniTerminal.h
include_directories("${BOBUI_DIR}/OmniUI/omnicore/include")

list(APPEND CMAKE_PREFIX_PATH "${BOBUI_DIR}/build_output")
list(APPEND CMAKE_PREFIX_PATH "${BOBUI_DIR}/build_output/lib/cmake")
set(Qt6_DIR "${BOBUI_DIR}/build_output/lib/cmake/Qt6")

message(STATUS "BOBUI_DIR is ${BOBUI_DIR}")
message(STATUS "Qt6_DIR is ${Qt6_DIR}")

find_package(Qt6 REQUIRED COMPONENTS Core Gui Widgets)

qt_standard_project_setup()

add_executable(MaestroNative
    main.cpp
)

target_link_libraries(MaestroNative PRIVATE
    Qt6::Core
    Qt6::Gui
    Qt6::Widgets
)

# QML disabled pending full 'bobui' Declarative module compilation
# qt_add_qml_module(MaestroNative
#     URI Maestro
#     VERSION 1.0
#     QML_FILES
#         assets/main.qml
# )

set_target_properties(MaestroNative PROPERTIES
    WIN32_EXECUTABLE TRUE
    MACOSX_BUNDLE TRUE
)
