# Excalidraw libraries (system-design icons)

Hand-drawn components from [libraries.excalidraw.com](https://libraries.excalidraw.com) (MIT),
vendored in `<skill-dir>/assets/excalidraw-libraries/` (`catalog.json` = ids, sources, item names).
Use them in the `whiteboard` preset instead of plain boxes when a node is a recognisable
component: load balancer, CDN, DNS, Redis, Kafka, Postgres, Lambda, S3, Kubernetes pod…

## Use in a `.wb.json`

```jsonc
{ "id": "lb",    "lib": "system-design:Load Balancer", "x": 600, "y": 410, "h": 130 },
{ "id": "cache", "lib": "logos:Redis", "label": "Redis\nhot links", "x": 1080, "y": 260, "w": 90 },
{ "id": "fn",    "lib": "aws:#0", "x": 300, "y": 200 }
```

- `lib`: `"<library>:<item name>"` (case/punctuation-insensitive, then substring match) or
  `"<library>:#<index>"`. Setting `lib` makes the node shape `lib`.
- Size: default fits the longest side to 110 px, aspect kept; give `w` **or** `h` to scale, both
  to fit inside a box. Edges clip to that box.
- `label` is drawn below the icon. Skip it when the item already carries text (most
  `system-design`, `aws`, `c4` items do) — otherwise the name shows twice.
- Colours: `"libColors": "theme"` (default, spec- or node-level) keeps brand colours and, in the
  dark theme, turns grey/black ink light and light-grey fills dark so text stays readable;
  `"original"` leaves the item untouched.
- Mix freely with plain shapes, containers (`parent`) and every edge option.
- Reference: `<skill-dir>/examples/url-shortener-library.wb.json`.

## Find an item

```bash
node <skill-dir>/scripts/excalidraw-library.mjs list                 # every library, item names
node <skill-dir>/scripts/excalidraw-library.mjs list aws             # one library, full refs
node <skill-dir>/scripts/excalidraw-library.mjs sheet aws <outBase>  # contact sheet PNG (#index + name)
```

Unsure what an item looks like → render its `sheet` and `Read` the PNG before using it.

## Libraries

| id | What's in it | Best for |
|---|---|---|
| `system-design` | Application Server, Multi Instance Server, Relational/Document/Columnar/Graph DB, Object/Cold Storage, Cache, Auth IAM, DNS, Load Balancer, Message Queue, Pipeline, Cloud, CDN, Archive, Mobile, Web Application | default pick for interview-style system design |
| `sd-kit` | Cloud, Stream, Servers, DB | simple infra sketches |
| `sd-icons` | MapReduce, ServiceCluster, cacheLayer | data processing |
| `sw-arch` | Microservice, Database, Cache, Event Bus, Documents, Browser, Mobile | coloured software architecture |
| `arch` | Slack, Docker, GitHub, VPC, Private/Public subnet, User, Users, Device, Server, Email | network boundaries, people |
| `it` | Document, Folder, Email, User, Network, Internet, Firewall, Cloud, Database, Server, Key, Timer, Gateway… (48) | generic IT + BPMN-ish symbols |
| `network` | Computer, VPN, Firewall, Server, Switch, Hub, Router, Client | network topology |
| `c4` | Person, Web App, Mobile App, Component, System, Existing System, Database, Group, Relation | C4 model diagrams |
| `data-sources` | GraphQL, Kafka, USB, Email, FTP | ingestion sources |
| `aws` | Lambda, AppSync, APIGateway, DynamoDB, Aurora, EventBridge, SQS, SNS, S3, CloudFront, SES, CloudWatch, StepFunctions, Amplify, Cognito, Kinesis, EFS, WAF, CodePipeline, CloudTrail, Route53, EventBridge Pipe | AWS serverless |
| `azure` | Key Vault, Application Insights, Azure DevOps, Blob Storage, Virtual Network, Active Directory, App Service, Service Bus Namespace, Virtual Machine, SQL Database, Data Lake… | Azure |
| `k8s` | ns, pod, rs, deploy, ds, sts, cronjob, ing, svc, ep, cm, secret, pv, pvc, hpa, netpol, crd, sa, role, master, node, etcd (each also as `<name>-text`) | Kubernetes resources |
| `logos` | Archive, Database, Docker, JSON, Kubernetes, Redis, Nginx, RabbitMQ, Chip, Lock, Load Balancer, Code, PostgreSQL, GitHub, Server Rack, Python, Browser, DNS | tech logos, sketch style |
| `tech-logos` | Kubernetes, Java, Docker, Git, Cloud Foundry, Terraform, Spring, Quarkus, Micronaut, Knative, Camunda, Azure, Kafka, Kotlin, OpenStack, Paketo, Neo4j, Redis | cloud-native / JVM logos |

## Editor

`open-diagram-editor.mjs` preloads every library into Excalidraw's Library panel (top-right
"Library" button), so the user can drag more components in by hand.

## Add a library

1. Download the `.excalidrawlib` from libraries.excalidraw.com (check it has no embedded images).
2. Save it minified as `assets/excalidraw-libraries/<id>.excalidrawlib`.
3. Add `<id>` to `catalog.json` (`file`, `title`, `author`, `source`); add `names` (`{"<index>": "Name"}`)
   for unnamed items after looking at its `sheet`.
4. Add a row to the table above.
