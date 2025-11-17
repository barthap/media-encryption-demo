# CORS Proxy

File hosting used in the demo app is missing CORS headers, causing web downloads to fail. Proxying solves the issue.

See original [CORS Anywhere README](https://github.com/Rob--W/cors-anywhere) for details.

Read more about [CORS proxying](https://httptoolkit.com/blog/cors-proxies/) in general.

## Usage

Run: `bun start`

Environment variables:

- `CORS_PROXY_HOST` - listening address, defaults to `0.0.0.0`
- `CORS_PROXY_PORT` - listening port, defaults to `8079`
