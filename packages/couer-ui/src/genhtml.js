module.exports = function generateUserInterfaceHTML(data) {
    const {
        title = 'Couer Application',
        root = '',
    } = data;
    return `<!doctype html>
<head>
    <title>${title}</title>
    <link rel="stylesheet" href="${root}/_resource/css/index.css" />
    <script src="${root}/_resource/js/index.js" type="text/javascript"></script>


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
            window.Couer.UI(approot, window.Couer.appData ).run();
        }
    </script>
</body>
`;

};
