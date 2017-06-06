package main

import (
	"log"
	"net/http"
	"os"
	"strconv"
	"encoding/json"
	"io/ioutil"
	"strings"
)

var deployments map[string]*Deployment = make(map[string]*Deployment)
var examplePvTemplate string
var examplePvcTemplate string
var exampleDeploymentTemplate string
var exampleServiceTemplate string
var kubeServiceProtocol string
var kubeServiceHost string
var kubeServicePort string
var kubeServiceToken string
var kubeServiceBaseUrl string

type Deployment struct {
	UserId string
	UpRequest *UpRequest
	UpResponse *UpResponse
}

type PingRequest struct {
	UserId string `json:"userId"`
}

type PingResponse struct {
	Status int `json:"status"`
}

type UpRequest struct {
	UserId string `json:"userId"`
	Repo string `json:"repo"`
}

type UpResponse struct {
	LogUrl string `json:"logUrl"`
	EditorUrl string `json:"editorUrl"`
	DockerComposePorts []int `json:"dockerComposePorts"`
	DockerComposeUrls []string `json:"dockerComposeUrls"`
}

func ping(w http.ResponseWriter, r *http.Request) {
	if r.Body == nil {
		http.Error(w, "Invalid request", 400)
		return
	}
	// decode request
	var pingRequest PingRequest
	err := json.NewDecoder(r.Body).Decode(&pingRequest)
	if err != nil {
		http.Error(w, err.Error(), 400)
		return
	}
	var pingResponse = PingResponse{0}
	err = json.NewEncoder(w).Encode(&pingResponse)
	if err != nil {
		log.Print("Error encoding response: ", err)
		http.Error(w, err.Error(), 400)
		return
	}
}

func up(w http.ResponseWriter, r *http.Request) {
	if r.Body == nil {
		http.Error(w, "Invalid request", 400)
		return
	}
	// decode request
	var upRequest UpRequest
	err := json.NewDecoder(r.Body).Decode(&upRequest)
	if err != nil {
		http.Error(w, err.Error(), 400)
		return
	}
	// create response
	var upResponse *UpResponse
	// call kubernetes
	log.Printf("Checking if deployment exists for user '%s'...\n", upRequest.UserId)
	exists, err := isExampleDeployed(upRequest.UserId, kubeServiceToken, kubeServiceBaseUrl)
	if err != nil {
		http.Error(w, err.Error(), 400)
		return
	} else if exists {
		log.Printf("Example deployed for user '%s'.\n", upRequest.UserId)
		deployment, ok := deployments[upRequest.UserId]
		if ok &&  strings.EqualFold(upRequest.Repo, deployment.UpRequest.Repo) {
			log.Println("Returning existing deployment details...")
			upResponse = deployment.UpResponse
		}
	}
	if upResponse == nil  {
		log.Println("Creating new deployment...")
		details, err := deployExample(upRequest.UserId, upRequest.Repo, examplePvTemplate, examplePvcTemplate, exampleDeploymentTemplate, exampleServiceTemplate, kubeServiceToken, kubeServiceBaseUrl)
		if err != nil {
			log.Print("Error creating deployment: ", err)
			http.Error(w, err.Error(), 400)
			return
		} else {
			upResponse = &UpResponse{}
			upResponse.LogUrl = details.LogUrl
			upResponse.EditorUrl = details.EditorUrl
			upResponse.DockerComposePorts = details.DockerComposePorts
			upResponse.DockerComposeUrls = details.DockerComposeUrls
			deployments[upRequest.UserId] = &Deployment{upRequest.UserId, &upRequest, upResponse}
		}
	}
	// return response
	err = json.NewEncoder(w).Encode(upResponse)
	if err != nil {
		log.Print("Error encoding response: ", err)
		http.Error(w, err.Error(), 400)
		return
	}
}

func loadFile(fp string) string {
	b, err := ioutil.ReadFile(fp) // just pass the file name
	if err != nil {
		log.Fatalf("Cannot read file")
	}
	return string(b)
}

func main() {
	if len(os.Args) != 2 {
		log.Fatalf("Usage: %s <port>", os.Args[0])
	}
	if _, err := strconv.Atoi(os.Args[1]); err != nil {
		log.Fatalf("Invalid port: %s (%s)\n", os.Args[1], err)
	}
	examplePvTemplate = loadFile("./example-pv.yml")
	examplePvcTemplate = loadFile("./example-pvc.yml")
	exampleDeploymentTemplate = loadFile("./example-deployment.yml")
	exampleServiceTemplate = loadFile("./example-service.yml")
	kubeServiceProtocol := os.Getenv("KUBERNETES_SERVICE_PROTOCOL")
	kubeServiceHost := os.Getenv("KUBERNETES_SERVICE_HOST")
	kubeServicePort := os.Getenv("KUBERNETES_SERVICE_PORT")
	kubeServiceTokenPathEnv := os.Getenv("KUBERNETES_TOKEN_PATH")
	if len(kubeServiceTokenPathEnv) > 0 {
		kubeServiceToken = loadFile(kubeServiceTokenPathEnv)
	} else {
		kubeServiceToken = ""
	}
	if len(kubeServiceProtocol) > 0 {
		kubeServiceBaseUrl = kubeServiceProtocol
	} else {
		kubeServiceBaseUrl = "https://"
	}
	kubeServiceBaseUrl += kubeServiceHost
	kubeServiceBaseUrl += ":"
	kubeServiceBaseUrl += kubeServicePort
	staticFileHandler := http.FileServer(http.Dir("public"))
	http.HandleFunc("/api/ping", ping)
	http.HandleFunc("/api/up", up)
	http.Handle("/", staticFileHandler)
	err := http.ListenAndServe(":"+os.Args[1], nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
