#
# BASE
#
FROM scratch

#
# BUILD
#
FROM node:16-alpine AS builder
WORKDIR /var/app

ADD package.json .
# ADD .npmrc .
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

#
# UNIT TESTING
#
FROM node:16-alpine AS tester

ARG UNIT_TEST=no
WORKDIR /var/app

COPY --from=builder /var/app  /var/app

RUN if [ "${UNIT_TEST}" = "yes" ]; then \
    echo "**** UNIT TESTING ****"; \
    npm test; \
    fi

#
# RUNTIME
#
FROM node:16-alpine
EXPOSE 3000
ENV ENV_NAME=${ENV_NAME}

# RUN groupadd pwcapp \
#     && adduser --quiet --home /var/app --ingroup pwcapp --gecos 'PwC' --disabled-password pwcapp

WORKDIR /var/app

COPY --from=builder /var/app/package.json .
# COPY --from=builder /var/app/.npmrc .
COPY --from=builder /var/app/build ./build
COPY --from=builder /var/app/docs ./docs/

# RUN chown -R pwcapp:pwcapp /var/app

# USER pwcapp 
RUN npm install --production --legacy-peer-deps

ENTRYPOINT ["npm", "start"]
