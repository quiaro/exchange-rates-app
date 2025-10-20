## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Docker

1. Create the docker image from the Dockerfile

   ```
   docker build -t "able:latest" .
   ```

2. Run the docker container from the docker image. The app will run `http://0.0.0.0:3000/`.
   ```
   docker run --name able-app -p 3000:3000 \
    -e FINNHUB_API_KEY=your_api_key_here \
    -e FINNHUB_WS_URL=wss://ws.finnhub.io \
    -d able:latest
   ```
