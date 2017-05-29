FROM golang:latest

RUN mkdir -p /go/src/app
WORKDIR /go/src/app
ADD . /go/src/app/ 
RUN go get -v -d
RUN CGO_ENABLED=0 GOOS=linux go install -a -installsuffix cgo app

FROM alpine:latest
COPY --from=0 /go/bin/app /app
ADD example-deployment.yml /
ADD example-service.yml /
ADD public /public
CMD ["/app", "80"]