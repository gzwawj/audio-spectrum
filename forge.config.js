module.exports = {
    packagerConfig: {
        name: "audio-spectrum",
        icon: "./app",
        overwrite: true,
        asar: true
    },
    makers: [
        {
            name: '@electron-forge/maker-zip'
        },
        {
            // Windows
            name: '@electron-forge/maker-squirrel',
            config: {
                icon: "./app",
            }
        }
    ],
    publishers: [
        {
            name: '@electron-forge/publisher-github',
            config: {
                repository: {
                    owner: 'gzwawj',
                    name: 'audio-spectrum'
                },
                prerelease: true
            }
        }
    ]
}
