
import os, sys
#import my custom modules [add to PATH]
sys.path.append(os.path.join(os.path.abspath(os.path.dirname(__file__)), 'udf'))

import local_http_server
import ws, mimetypes, time
import uuid, time, random, threading
import subprocess
class ws_client:
    clients = {}
    def __init__(self):
        self.code = str(uuid.uuid4())
        ws_client.clients[self.code] = self

    def recv(self, msg):
        msg = eval(msg)
        match msg["t"]: # msg["type"]
            # Authentication
            case "ath": # auth
                # {
                # 't': 'ath',
                # 'c': '__authentication_code__',
                # }
                # self.auth(msg) #TODO: add auth method
                pass
            case 'welcome':
                self.welcome()
            # list all files inside the shared directory
            case "ls":
                # request (from client)
                # {
                #  't': 'ls',
                #  'd': 'relative path to shared root dir. where client stands in his browser ./',
                # }
                # response (from server)
                # {
                #  't': 'ls',
                #  'd': 'relative path to shared root dir. where client stands in his browser ./',
                #  'ls': [
                #     {'n': 'name', 't': 'type'},
                #     ...
                #     ],
                # }
                self.cwd = msg['d']
                items = []
                cwd = os.path.join(ws_client.root, self.cwd)
                for i in os.listdir(cwd):
                    if os.path.isdir(os.path.join(cwd, i)):
                        t = 'dir'
                    else:
                        t = str(mimetypes.guess_type(i, strict=False)[0])
                    items.append({'n': i, 't': t})
                # send response
                self.send(f"({{'t': 'ls', 'd': '{msg['d']}', 'ls': {str(items)}}})")
            # request to open extra http port on current CWD
            case "http.server.start":
                # request (from client)
                # {
                #  't': 'http.server.start',
                #  'd': 'CWD root of that http server',
                # }
                # response (from server)
                # {
                #  't': 'http.server.start',
                #  'p': 'port of that http server',
                # }
                try: self.http_servers
                except: self.http_servers = {}
                port = str(ws.get_free_port())
                cwd = os.path.join(ws_client.root, msg['d'])
                process = subprocess.Popen(
                    ['http-server', '-p', port],
                    cwd=cwd,
                    stderr=subprocess.STDOUT,
                    stdout=subprocess.DEVNULL
                ) # use nodeJs server to support seeking in html video element
                time.sleep(0.500) # wait 500 ms for http server to start
                self.http_servers[port] = process # store the proceess object to terminate later
                # send response
                self.send(f"({{'t': 'http.server.start', 'p': '{port}'}})")
            # request to terminate previously requested extra http port on specific CWD
            case 'http.server.term':
                # request (from client)
                # {
                #  't': 'http.server.term',
                #  'p': 'port of that http server',
                # }
                # response (from server): None
                try:
                    self.http_servers[msg['p']].terminate()
                except AttributeError:
                    # no custom http servers yet
                    pass


    def auth(self, msg):
        # if authenticator.check(msg['c']):
        #     self.welcome()
        # else:
        #     self.send("({'t': 'shutdown'})")
        pass

    def welcome(self):
        print('welcome:', self.code)
        # send http server port for file sharing
        self.send(f"({{'t': 'ftp', 'p': '{ws_client.http_port}'}})")

    def onClientClose(self, exception):
        del ws_client.clients[self.code]
        if 'received 1001 (going away); then sent 1001 (going away)' in str(exception):
            print(f'Client [{self.code}] went away.')
        # close custom http servers
        try:
            for s in self.http_servers:
                self.http_servers[s].terminate()
        except: pass


def main(root):
    # init WebSocket server
    ws_port = ws.get_free_port()
    ws.init_server(port=ws_port, child_class=ws_client)
    with open('app/js/ws_port.js', 'wt') as f:
        f.write(f'window.ws_port = {ws_port};')

    # ws_client.http_port = local_http_server.init_local_http(root=root, accept_outer_connection=True)
    


    website_port = local_http_server.init_local_http(root='./app', accept_outer_connection=True)
    ws_client.root = root
    print(f'URL: http://localhost:{website_port}')


    ws_client.http_port = ws.get_free_port()
    import subprocess
    # subprocess.Popen(['pypy', '-m', 'http.server', str(ws_client.http_port), '-d', root]) # pypy is faster than python [as a server] #TODO: try using the same for pypy
    subprocess.Popen(
        ['http-server', '-p', str(ws_client.http_port)],
        cwd=root,
        stderr=subprocess.STDOUT,
        stdout=subprocess.DEVNULL
    ) # use nodeJs server to support seeking in html video element
    # print('ws_client.http_port', ws_client.http_port)

def set_on_exit(_def, *args, **kwargs): # do something on Ctel+C interrupt
    import signal
    import sys
    def signal_handler(sig, frame):
        _def(*args, **kwargs)
        # print('on exit')
        sys.exit(0) # terminate 👊💥
    signal.signal(signal.SIGINT, signal_handler)
    # signal.pause()

if __name__ == "__main__":
    old_cwd = os.getcwd()
    set_on_exit(os.chdir, old_cwd)
    if len(sys.argv) > 1:
        dir_to_share = os.path.abspath(sys.argv[1])
    else:
        dir_to_share = old_cwd
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    main(dir_to_share)

