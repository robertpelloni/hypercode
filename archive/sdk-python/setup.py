from setuptools import setup, find_packages

setup(
    name="hypercode-sdk",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "requests>=2.31.0",
    ],
    author="OhMyOpenCode",
    description="Python SDK for Hypercode AI Orchestration System",
    keywords="ai, agents, orchestration, automation",
    python_requires=">=3.8",
)
