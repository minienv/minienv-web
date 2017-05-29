package main

import (
	"log"
	"net/http"
	"os"
	"strconv"
	"encoding/json"
	"io/ioutil"
	"crypto/tls"
)

var exampleDeploymentTemplate string
var exampleServiceTemplate string
var kubeServiceProtocol string
var kubeServiceHost string
var kubeServicePort string
var kubeServiceToken string
var kubeServiceBaseUrl string

var VAR_DEPLOYMENT_NAME string = "$deploymentName"
var VAR_APP_LABEL string = "$appLabel"
var VAR_EDITOR_PORT string = "$editorPort"
var VAR_PROXY_PORT string = "$proxyPort"

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
	NodeHostName string `json:"nodeHostName"`
	EditorPort int `json:"editorPort"`
	EditorUrl string `json:"editorUrl"`
	ProxyPort int `json:"proxyPort"`
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
	// call kubernetes
	url := kubeServiceBaseUrl + "/apis/apps/v1beta1/namespaces/default/deployments"
	log.Printf("KUBE URL = %s\n", url)
	// mw:FIX THIS
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	client := &http.Client{Transport: tr}
	req, err := http.NewRequest("GET", url, nil)
	if len(kubeServiceToken) > 0 {
		log.Printf("Authorization=Bearer %s\n", kubeServiceToken)
		req.Header.Add("Authorization", "Bearer " + kubeServiceToken)
	}
	resp, err := client.Do(req)
	if err != nil {
		log.Print("Error making request: ", err)
		http.Error(w, err.Error(), 400)
		return
	}
	defer resp.Body.Close()
	_, err = ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Print("Error reading response: ", err)
		http.Error(w, err.Error(), 400)
		return
	}
	//w.Header().Set("Content-Type", "application/json")
	//w.Write(body)

	var upResponse = UpResponse{}
	upResponse.NodeHostName = "minikube.dev"
	upResponse.EditorUrl = "http://localhost:8082"
	upResponse.DockerComposeUrls = []string{"http://33000.minikube.dev:31879", "http://38080.minikube.dev:31879"}
	err = json.NewEncoder(w).Encode(&upResponse)
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
