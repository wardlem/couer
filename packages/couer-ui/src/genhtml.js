module.exports = function generateUserInterfaceHTML(data) {
    const {
        title = 'Couer Application',
        root,
    } = data;
    return `<!doctype html>
<head>
    <title>${title}</title>
    <script src="${root}/_system/system.js" type="application/javascript"></script>
    <!-- <link rel="shortcut icon" href="/static/images/favicon.ico" /> -->
    <!-- <link rel="stylesheet" type="text/css" href="${root}/_resource/vendor/semantic/semantic.min.css" /> -->
    <link rel="stylesheet" href="${root}/_skin/main.css">
    <link rel="stylesheet" href="${root}/_data/appstyles.css">
    <!-- <script src="/admin/static/semantic/semantic.min.js"></script> -->
    <!-- <script src="/admin/static/scripts/moment-with-locales.min.js"></script> -->

    <meta name="viewport" content="width=device-width, initial-scale=1">

</head>
<body>
    <div id="approot"></div>

    <script type="application/javascript">
        // thanks: https://developer.mozilla.org/en-US/docs/Web/Events/readystatechange
        document.onreadystatechange = function () {
            if (document.readyState === "interactive") {
                initApplication();
            }
        }

        function initApplication() {
            var approot = document.getElementById('approot');
            SystemJS.config({
                map: {
                    mithril: 'https://unpkg.com/mithril/mithril.js',
                },
            });
            SystemJS.import('${root}/_resource/js/couerui.js').then((CouerUI) => {
                SystemJS.import('${root}/_data/appdata.js').then((data) => {
                    app = CouerUI(approot, data);
                    app.run();
                });
            }).catch(e => {
                console.error(e)
            })
        }

    </script>
</body>
`;

};
