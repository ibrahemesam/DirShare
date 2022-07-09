**this is a styled wrapper for Python's http.server** `python -m http.server 8080`
which can be used to share files from your device to other devicies on the same network.

this is a styled wrapper overcome the default crude style of the http server
using a custom html, css (:

Note:-
you should download my custom python & js modules from: https://github.com/ibrahemesam/udf
then save them inside a 'udf' folder beside the 'main.py' file

Requirements:-
`python -m pip install websockets`
`nodejs` required by`npm install -g http-server`

Usage:-
make an alias for the 'main.py' file eg:
`alias dirshare="python '/path/to/main.py'"`
then:
`dirshare ./` or `dirshare` to share the current working directory
or
`dirshare /path/to/any/folder` to share that specific folder
