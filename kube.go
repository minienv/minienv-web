package main

import (
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"reflect"
	"strconv"
	"strings"

	"gopkg.in/yaml.v2"
)

var VAR_SERVICE_NAME string = "$serviceName"
var VAR_DEPLOYMENT_NAME string = "$deploymentName"
var VAR_APP_LABEL string = "$appLabel"
var VAR_LOG_PORT string = "$logPort"
var VAR_EDITOR_PORT string = "$editorPort"
var VAR_PROXY_PORT string = "$proxyPort"
var VAR_GIT_REPO string = "$gitRepo"

var DEFAULT_LOG_PORT string = "30081"
var DEFAULT_EDITOR_PORT string = "30082"
var DEFAULT_PROXY_PORT string = "30083"

type GetDeploymentResponse struct {
	Kind string `json:"kind"`
}

type SaveDeploymentResponse struct {
	Kind string `json:"kind"`
}

type DeleteDeploymentResponse struct {
	Kind string `json:"kind"`
}

type GetServiceResponse struct {
	Kind string `json:"kind"`
}

type SaveServiceResponse struct {
	Kind string `json:"kind"`
	Spec *ServiceSpec `json:"spec"`
}

type ServiceSpec struct {
	Ports []*ServiceSpecPort `json:"ports"`
}

type ServiceSpecPort struct {
	Name string `json:"name"`
	NodePort int `json:"nodePort"`
}

type DeleteServiceResponse struct {
	Kind string `json:"kind"`
}

type DeploymentDetails struct {
	NodeHostName string
	LogPort int
	LogUrl string
	EditorPort int
	EditorUrl string
	ProxyPort int
	DockerComposePorts []int
	DockerComposeUrls []string
}

func getHttpClient() *http.Client {
	// mw:FIX THIS
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	client := &http.Client{Transport: tr}
	return client
}

func getDeployment(name string, kubeServiceToken string, kubeServiceBaseUrl string) (*GetDeploymentResponse, error) {
	url := fmt.Sprintf("%s/apis/extensions/v1beta1/namespaces/default/deployments/%s", kubeServiceBaseUrl, name)
	client := getHttpClient()
	req, err := http.NewRequest("GET", url, nil)
	if len(kubeServiceToken) > 0 {
		log.Printf("Authorization=Bearer %s\n", kubeServiceToken)
		req.Header.Add("Authorization", "Bearer " + kubeServiceToken)
	}
	resp, err := client.Do(req)
	if err != nil {
		log.Println("Error getting deployment: ", err)
		return nil, err
	} else {
		var getDeploymentResp GetDeploymentResponse
		err := json.NewDecoder(resp.Body).Decode(&getDeploymentResp)
		if err != nil {
			return nil, err
		} else if getDeploymentResp.Kind != "Deployment" {
			return nil, nil
		} else {
			return &getDeploymentResp, nil
		}
	}
}

func saveDeployment(yaml string, kubeServiceToken string, kubeServiceBaseUrl string) (*SaveDeploymentResponse, error) {
	url := fmt.Sprintf("%s/apis/extensions/v1beta1/namespaces/default/deployments", kubeServiceBaseUrl)
	//log.Printf("POST %s\n%s\n", url, yaml)
	client := getHttpClient()
	req, err := http.NewRequest("POST", url, strings.NewReader(yaml))
	req.Header.Add("Content-Type", "application/yaml")
	if len(kubeServiceToken) > 0 {
		log.Printf("Authorization=Bearer %s\n", kubeServiceToken)
		req.Header.Add("Authorization", "Bearer " + kubeServiceToken)
	}
	resp, err := client.Do(req)
	if err != nil {
		log.Println("Error saving deployment: ", err)
		return nil, err
	} else {
		var saveDeploymentResp SaveDeploymentResponse
		err := json.NewDecoder(resp.Body).Decode(&saveDeploymentResp)
		if err != nil {
			return nil, err
		} else if saveDeploymentResp.Kind != "Deployment" {
			return nil, errors.New("Unable to create deployment")
		} else {
			return &saveDeploymentResp, nil
		}
	}
}

func deleteDeployment(name string, kubeServiceToken string, kubeServiceBaseUrl string) (bool, error) {
	url := fmt.Sprintf("%s/apis/extensions/v1beta1/namespaces/default/deployments/%s", kubeServiceBaseUrl, name)
	client := getHttpClient()
	req, err := http.NewRequest("DELETE", url, nil)
	if len(kubeServiceToken) > 0 {
		log.Printf("Authorization=Bearer %s\n", kubeServiceToken)
		req.Header.Add("Authorization", "Bearer " + kubeServiceToken)
	}
	resp, err := client.Do(req)
	if err != nil {
		log.Println("Error deleting deployment: ", err)
		return false, err
	} else {
		var deleteDeploymentResp DeleteDeploymentResponse
		err := json.NewDecoder(resp.Body).Decode(&deleteDeploymentResp)
		if err != nil {
			return false, err
		} else {
			return deleteDeploymentResp.Kind == "Deployment", nil
		}
	}
}

func getService(name string, kubeServiceToken string, kubeServiceBaseUrl string) (*GetServiceResponse, error) {
	url := fmt.Sprintf("%s/api/v1/namespaces/default/services/%s", kubeServiceBaseUrl, name)
	client := getHttpClient()
	req, err := http.NewRequest("GET", url, nil)
	if len(kubeServiceToken) > 0 {
		log.Printf("Authorization=Bearer %s\n", kubeServiceToken)
		req.Header.Add("Authorization", "Bearer " + kubeServiceToken)
	}
	resp, err := client.Do(req)
	if err != nil {
		log.Println("Error getting service: ", err)
		return nil, err
	} else {
		var getServiceResp GetServiceResponse
		err := json.NewDecoder(resp.Body).Decode(&getServiceResp)
		if err != nil {
			return nil, err
		} else if getServiceResp.Kind != "Service" {
			return nil, nil
		} else {
			return &getServiceResp, nil
		}
	}
}

func saveService(yaml string, kubeServiceToken string, kubeServiceBaseUrl string) (*SaveServiceResponse, error) {
	url := fmt.Sprintf("%s/api/v1/namespaces/default/services", kubeServiceBaseUrl)
	//log.Printf("POST %s\n%s\n", url, yaml)
	client := getHttpClient()
	req, err := http.NewRequest("POST", url, strings.NewReader(yaml))
	req.Header.Add("Content-Type", "application/yaml")
	if len(kubeServiceToken) > 0 {
		log.Printf("Authorization=Bearer %s\n", kubeServiceToken)
		req.Header.Add("Authorization", "Bearer " + kubeServiceToken)
	}
	resp, err := client.Do(req)
	if err != nil {
		log.Print("Error saving service: ", err)
		return nil, err
	} else {
		var saveServiceResp SaveServiceResponse
		err := json.NewDecoder(resp.Body).Decode(&saveServiceResp)
		if err != nil {
			return nil, err
		} else if saveServiceResp.Kind != "Service" {
			return nil, errors.New("Unable to create deployment")
		} else {
			return &saveServiceResp, nil
		}
	}
}

func deleteService(name string, kubeServiceToken string, kubeServiceBaseUrl string) (bool, error) {
	url := fmt.Sprintf("%s/api/v1/namespaces/default/services/%s", kubeServiceBaseUrl, name)
	client := getHttpClient()
	req, err := http.NewRequest("DELETE", url, nil)
	if len(kubeServiceToken) > 0 {
		log.Printf("Authorization=Bearer %s\n", kubeServiceToken)
		req.Header.Add("Authorization", "Bearer " + kubeServiceToken)
	}
	resp, err := client.Do(req)
	if err != nil {
		log.Println("Error deleting service: ", err)
		return false, err
	} else {
		var deleteServiceResp DeleteServiceResponse
		err := json.NewDecoder(resp.Body).Decode(&deleteServiceResp)
		if err != nil {
			return false, err
		} else {
			return deleteServiceResp.Kind == "Service", nil
		}
	}
}

func isExampleDeployed(userId string, kubeServiceToken string, kubeServiceBaseUrl string) (bool, error) {
	getDeploymentResp, err := getDeployment(getDeploymentName(userId), kubeServiceToken, kubeServiceBaseUrl)
	if err != nil {
		return false, err
	} else {
		return getDeploymentResp != nil, nil
	}
}

func deleteExample(userId string, kubeServiceToken string, kubeServiceBaseUrl string) (error) {
	_, err := deleteDeployment(getDeploymentName(userId), kubeServiceToken, kubeServiceBaseUrl)
	_, err2 := deleteService(getServiceName(userId), kubeServiceToken, kubeServiceBaseUrl)
	if err != nil {
		return err
	} else if err2 != nil {
		return err2
	} else {
		return nil
	}
}

func deployExample(userId string, gitRepo string, deploymentTemplate string, serviceTemplate string, kubeServiceToken string, kubeServiceBaseUrl string) (*DeploymentDetails, error) {
	// download docker-compose yaml
	dockerComposePorts := []int{}
	url := fmt.Sprintf("%s/raw/master/docker-compose.yml", gitRepo)
	log.Printf("Downloading docker-compose file from '%s'...\n", url)
	client := getHttpClient()
	req, err := http.NewRequest("GET", url, nil)
	resp, err := client.Do(req)
	if err != nil {
		log.Println("Error downloading docker-compose file: ", err)
		return nil, err
	} else {
		m := make(map[interface{}]interface{})
		data, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			log.Println("Error downloading docker-compose file: ", err)
			return nil, err
		} else {
			err = yaml.Unmarshal(data, &m)
			if err != nil {
				log.Println("Error parsing docker-compose file: ", err)
				return nil, err
			} else {
				for k, v := range m {
					getDockerComposePorts(v, &dockerComposePorts, k.(string))
				}
			}
		}
	}
	//
	var deploymentName = getDeploymentName(userId)
	var appLabel = getAppLabel(userId)
	deployment := deploymentTemplate
	deployment = strings.Replace(deployment, VAR_DEPLOYMENT_NAME, deploymentName, -1)
	deployment = strings.Replace(deployment, VAR_APP_LABEL, appLabel, -1)
	deployment = strings.Replace(deployment, VAR_LOG_PORT, DEFAULT_LOG_PORT, -1)
	deployment = strings.Replace(deployment, VAR_EDITOR_PORT, DEFAULT_EDITOR_PORT, -1)
	deployment = strings.Replace(deployment, VAR_PROXY_PORT, DEFAULT_PROXY_PORT, -1)
	deployment = strings.Replace(deployment, VAR_GIT_REPO, gitRepo, -1)
	_, err = saveDeployment(deployment, kubeServiceToken, kubeServiceBaseUrl)
	if err != nil {
		log.Println("Error saving deployment: ", err)
		return nil, err
	} else {
		// deployment created, now create the service
		var serviceName = getServiceName(userId)
		service := serviceTemplate
		service = strings.Replace(service, VAR_SERVICE_NAME, serviceName, -1)
		service = strings.Replace(service, VAR_APP_LABEL, appLabel, -1)
		service = strings.Replace(service, VAR_LOG_PORT, DEFAULT_LOG_PORT, -1)
		service = strings.Replace(service, VAR_EDITOR_PORT, DEFAULT_EDITOR_PORT, -1)
		service = strings.Replace(service, VAR_PROXY_PORT, DEFAULT_PROXY_PORT, -1)
		serviceResp, err := saveService(service, kubeServiceToken, kubeServiceBaseUrl)
		if err != nil {
			log.Println("Error saving service: ", err)
			return nil, err
		} else {
			logNodePort := 0
			editorNodePort := 0
			proxyNodePort := 0
			for _, element := range serviceResp.Spec.Ports {
				if element.Name == "log" {
					logNodePort = element.NodePort
				}
				if element.Name == "editor" {
					editorNodePort = element.NodePort
				}
				if element.Name == "proxy" {
					proxyNodePort = element.NodePort
				}
				// element is the element from someSlice for where we are
			}
			details := &DeploymentDetails{}
			details.NodeHostName = os.Getenv("EXUP_NODE_HOST_NAME") // mw:TODO
			details.LogPort = logNodePort
			details.LogUrl = fmt.Sprintf("http://%s:%d", details.NodeHostName, details.LogPort)
			details.EditorPort = editorNodePort
			details.EditorUrl = fmt.Sprintf("http://%s:%d", details.NodeHostName, details.EditorPort)
			details.ProxyPort = proxyNodePort
			details.DockerComposePorts = dockerComposePorts
			for _, element := range details.DockerComposePorts {
				details.DockerComposeUrls = append(details.DockerComposeUrls, fmt.Sprintf("http://%d.%s:%d",element,details.NodeHostName,details.ProxyPort))
			}
			return details, nil
		}
	}
}


func getDockerComposePorts(v interface{}, ports *[]int, parent string) {
	typ := reflect.TypeOf(v).Kind()
	if typ == reflect.String {
		if parent == "ports" {
			portString := strings.SplitN(v.(string), ":", 2)[0]
			port, err := strconv.Atoi(portString)
			if err == nil {
				*ports = append(*ports, port)
			}
		}
	} else if typ == reflect.Slice {
		getDockerComposePortsSlice(v.([]interface{}), ports, parent)
	} else if typ == reflect.Map {
		getDockerComposePortsMap(v.(map[interface{}]interface{}), ports)
	}
}

func getDockerComposePortsMap(m map[interface{}]interface{}, ports *[]int) {
	for k, v := range m {
		getDockerComposePorts(v, ports, strings.ToLower(k.(string)))
	}
}

func getDockerComposePortsSlice(slc []interface{}, ports *[]int, parent string) {
	for _, v := range slc {
		getDockerComposePorts(v, ports, parent)
	}
}

func getServiceName(userId string) string {
	return strings.ToLower(fmt.Sprintf("u-%s-service", userId))
}

func getDeploymentName(userId string) string {
	return strings.ToLower(fmt.Sprintf("u-%s-deployment", userId))
}

func getAppLabel(userId string) string {
	return strings.ToLower(fmt.Sprintf("u-%s", userId))
}
