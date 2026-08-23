# captrucking

Marketing site for CAP Trucking LLC — a reimagined, high-conversion freight carrier site.

Live at **https://captrucking.makeacompany.ai**.

## Stack

- Static single-page site (HTML/CSS/vanilla JS), served by nginx.
- 3D hero: Three.js freight-network globe with animated lanes.
- Interactive lane-network map, animated stat counters, and a live rate estimator.
- No build step. Files live in `site/`.

## Local dev

```bash
cd site && python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy

Tag a release and the CI does the rest:

```bash
git tag v0.1.0 && git push origin v0.1.0
```

- `.github/workflows/build.yml` builds `geeemoney/captrucking` and pushes to Docker Hub on `v*` tags.
- The reusable `gitops-release` workflow opens a PR to `BimRoss/rancher-admin` bumping the image tag in `admin/apps/captrucking/deployment.yaml`.
- Fleet syncs the change to the cluster; cert-manager issues TLS for the host.

## Contact info on the site

Real CAP Trucking details: (888) 857-8023 · cpatton@captruckllc.com · 101 N Seventh St, Louisville, KY 40202.

Stat figures (miles covered, lane volumes) are illustrative.
