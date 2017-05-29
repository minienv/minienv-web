FROM golang:latest

RUN mkdir -p /go/src/app
WORKDIR /go/src/app
ADD . /go/src/app/ 
RUN go get -v -d
RUN CGO_ENABLED=0 GOOS=linux go install -a -installsuffix cgo app

FROM alpine:latest
COPY --from=0 /go/bin/app /app
<<<<<<< HEAD
ADD index.html /
=======
ADD public /public
>>>>>>> 5c654a271c8c6e671739dee1ffea7df8d4c889ec
CMD ["/app", "80"]
