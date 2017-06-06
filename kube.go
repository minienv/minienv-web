package main

import (
	"bytes"
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
	"time"

	"gopkg.in/yaml.v2"
)

var VAR_PV_NAME string = "$pvName"
var VAR_PV_PATH string = "$pvPath"
var VAR_PVC_NAME string = "$pvcName"
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

type GetPersistentVolumeResponse struct {
	Kind string `json:"kind"`
}

type SavePersistentVolumeResponse struct {
	Kind string `json:"kind"`
}

type GetPersistentVolumeClaimResponse struct {
	Kind string `json:"kind"`
}

type SavePersistentVolumeClaimResponse struct {
	Kind string `json:"kind"`
}

type GetDeploymentResponse struct {
	Kind string `json:"kind"`
}

type SaveDeploymentResponse struct {
	Kind string `json:"kind"`
}

type DeleteDeploymentResponse struct {
	Kind string `json:"kind"`
}

type GetReplicaSetsResponse struct {
	Kind string `json:"kind"`
	Items []*GetReplicaSetsItems `json:"items"`
}

type GetReplicaSetsItems struct {
	Metadata *GetReplicaSetsItemMetadata `json:"metadata"`
}

type GetReplicaSetsItemMetadata struct {
	Name string `json:"name"`
	Labels *GetReplicaSetsItemMetadataLabel `json:"labels"`
}

type GetReplicaSetsItemMetadataLabel struct {
	App string `josn:"app"`
}

type DeleteReplicaSetBody struct {
	Kind string `json:"kind"`
	OrphanDependents bool `json:"orphanDependents"`
}

type DeleteReplicaSetResponse struct {
	Kind string `json:"kind"`
}

type GetPodsResponse struct {
	Kind string `json:"kind"`
	Items []*GetPodsItems `json:"items"`
}

type GetPodsItems struct {
	Metadata *GetPodsItemMetadata `json:"metadata"`
}

type GetPodsItemMetadata struct {
	Name string `json:"name"`
	Labels *GetPodsItemMetadataLabel `json:"labels"`
}

type GetPodsItemMetadataLabel struct {
	App string `josn:"app"`
}

type DeletePodResponse struct {
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

func getPersistentVolume(name string, kubeServiceToken string, kubeServiceBaseUrl string) (*GetPersistentVolumeResponse, error) {
	url := fmt.Sprintf("%s/api/v1/persistentvolumes/%s", kubeServiceBaseUrl, name)
	client := getHttpClient()
	req, err := http.NewRequest("GET", url, nil)
	if len(kubeServiceToken) > 0 {
		req.Header.Add("Authorization", "Bearer " + kubeServiceToken)
	}
	resp, err := client.Do(req)
	if err != nil {
		log.Println("Error getting service: ", err)
		return nil, err
	} else {
		var getPersistentVolumeResp GetPersistentVolumeResponse
		err := json.NewDecoder(resp.Body).Decode(&getPersistentVolumeResp)
		if err != nil {
			return nil, err
		} else if getPersistentVolumeResp.Kind != "PersistentVolume" {
			return nil, nil
		} else {
			return &getPersistentVolumeResp, nil
		}
	}
}

func savePersistentVolume(yaml string, kubeServiceToken string, kubeServiceBaseUrl string) (*SavePersistentVolumeResponse, error) {
	url := fmt.Sprintf("%s/api/v1/persistentvolumes", kubeServiceBaseUrl)
	client := getHttpClient()
	req, err := http.NewRequest("POST", url, strings.NewReader(yaml))
	req.Header.Add("Content-Type", "application/yaml")
	if len(kubeServiceToken) > 0 {
		req.Header.Add("Authorization", "Bearer " + kubeServiceToken)
	}
	resp, err := client.Do(req)
	if err != nil {
		log.Print("Error saving persistent volume: ", err)
		return nil, err
	} else {
		var savePersistentVolumeResp SavePersistentVolumeResponse
		err := json.NewDecoder(resp.Body).Decode(&savePersistentVolumeResp)
		if err != nil {
			return nil, err
		} else if savePersistentVolumeResp.Kind != "PersistentVolume" {
			return nil, errors.New("Unable to create persistent volume")
		} else {
			return &savePersistentVolumeResp, nil
		}
	}
}

func getPersistentVolumeClaim(name string, kubeServiceToken string, kubeServiceBaseUrl string) (*GetPersistentVolumeClaimResponse, error) {
	url := fmt.Sprintf("%s/api/v1/namespaces/default/persistentvolumeclaims/%s", kubeServiceBaseUrl, name)
	client := getHttpClient()
	req, err := http.NewRequest("GET", url, nil)
	if len(kubeServiceToken) > 0 {
		req.Header.Add("Authorization", "Bearer " + kubeServiceToken)
	}
	resp, err := client.Do(req)
	if err != nil {
		log.Println("Error getting service: ", err)
		return nil, err
	} else {
		var getPersistentVolumeClaimResp GetPersistentVolumeClaimResponse
		err := json.NewDecoder(resp.Body).Decode(&getPersistentVolumeClaimResp)
		if err != nil {
			return nil, err
		} else if getPersistentVolumeClaimResp.Kind != "PersistentVolumeClaim" {
			return nil, nil
		} else {
			return &getPersistentVolumeClaimResp, nil
		}
	}
}

func savePersistentVolumeClaim(yaml string, kubeServiceToken string, kubeServiceBaseUrl string) (*SavePersistentVolumeClaimResponse, error) {
	url := fmt.Sprintf("%s/api/v1/namespaces/default/persistentvolumeclaims", kubeServiceBaseUrl)
	client := getHttpClient()
	req, err := http.NewRequest("POST", url, strings.NewReader(yaml))
	req.Header.Add("Content-Type", "application/yaml")
	if len(kubeServiceToken) > 0 {
		req.Header.Add("Authorization", "Bearer " + kubeServiceToken)
	}
	resp, err := client.Do(req)
	if err != nil {
		log.Print("Error saving persistent volume claim: ", err)
		return nil, err
	} else {
		var savePersistentVolumeClaimResp SavePersistentVolumeClaimResponse
		err := json.NewDecoder(resp.Body).Decode(&savePersistentVolumeClaimResp)
		if err != nil {
			return nil, err
		} else if savePersistentVolumeClaimResp.Kind != "PersistentVolumeClaim" {
			return nil, errors.New("Unable to create persistent volume claim")
		} else {
			return &savePersistentVolumeClaimResp, nil
		}
	}
}

func getDeployment(name string, kubeServiceToken string, kubeServiceBaseUrl string) (*GetDeploymentResponse, error) {
	url := fmt.Sprintf("%s/apis/extensions/v1beta1/namespaces/default/deployments/%s", kubeServiceBaseUrl, name)
	client := getHttpClient()
	req, err := http.NewRequest("GET", url, nil)
	if len(kubeServiceToken) > 0 {
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
	client := getHttpClient()
	req, err := http.NewRequest("POST", url, strings.NewReader(yaml))
	req.Header.Add("Content-Type", "application/yaml")
	if len(kubeServiceToken) > 0 {
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
	log.Printf("Deleting deployment '%s'...\n", name)
	url := fmt.Sprintf("%s/apis/extensions/v1beta1/namespaces/default/deployments/%s", kubeServiceBaseUrl, name)
	client := getHttpClient()
	req, err := http.NewRequest("DELETE", url, nil)
	if len(kubeServiceToken) > 0 {
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

func getReplicaSets(kubeServiceToken string, kubeServiceBaseUrl string) (*GetReplicaSetsResponse, error) {
	url := fmt.Sprintf("%s/apis/extensions/v1beta1/namespaces/default/replicasets", kubeServiceBaseUrl)
	client := getHttpClient()
	req, err := http.NewRequest("GET", url, nil)
	if len(kubeServiceToken) > 0 {
		req.Header.Add("Authorization", "Bearer " + kubeServiceToken)
	}
	resp, err := client.Do(req)
	if err != nil {
		log.Println("Error getting replica sets: ", err)
		return nil, err
	} else {
		var getReplicaSetsResponse GetReplicaSetsResponse
		err := json.NewDecoder(resp.Body).Decode(&getReplicaSetsResponse)
		if err != nil {
			return nil, err
		} else if getReplicaSetsResponse.Kind != "ReplicaSetList" {
			return nil, nil
		} else {
			return &getReplicaSetsResponse, nil
		}
	}
}

func getReplicaSetName(label string, kubeServiceToken string, kubeServiceBaseUrl string) (string, error) {
	log.Printf("Getting replica set name for label '%s'...\n", label)
	getReplicaSetsResponse, err := getReplicaSets(kubeServiceToken, kubeServiceBaseUrl)
	if err != nil {
		return "", err
	} else {
		if getReplicaSetsResponse.Items != nil && len(getReplicaSetsResponse.Items) > 0 {
			for _, element := range getReplicaSetsResponse.Items {
				if element.Metadata != nil && element.Metadata.Labels != nil && element.Metadata.Labels.App == label {
					log.Printf("Replica set name for label '%s' = '%s'\n", label, element.Metadata.Name)
					return element.Metadata.Name, nil
				}
			}
		}
		return "", nil
	}
}

func deleteReplicaSet(label string, kubeServiceToken string, kubeServiceBaseUrl string) (bool, error) {
	log.Printf("Deleting replica set for label '%s'...\n", label)
	name, err := getReplicaSetName(label, kubeServiceToken, kubeServiceBaseUrl)
	if err != nil {
		log.Println("Error deleting replica set: ", err)
		return false, err
	} else if name == "" {
		return false, nil
	}
	// delete replica set
	log.Printf("Deleting replica set '%s'...\n", name)
	url := fmt.Sprintf("%s/apis/extensions/v1beta1/namespaces/default/replicasets/%s", kubeServiceBaseUrl, name)
	client := getHttpClient()
	body := &DeleteReplicaSetBody{Kind: "DeleteOptions", OrphanDependents: false}
	b := new(bytes.Buffer)
	json.NewEncoder(b).Encode(body)
	req, err := http.NewRequest("DELETE", url, b)
	req.Header.Add("Content-Type", "application/json")
	if len(kubeServiceToken) > 0 {
		req.Header.Add("Authorization", "Bearer " + kubeServiceToken)
	}
	resp, err := client.Do(req)
	if err != nil {
		log.Println("Error deleting replica set: ", err)
		return false, err
	} else {
		var deleteReplicaSetResp DeleteReplicaSetResponse
		err := json.NewDecoder(resp.Body).Decode(&deleteReplicaSetResp)
		if err != nil {
			return false, err
		} else {
			return deleteReplicaSetResp.Kind == "ReplicaSet", nil
		}
	}
}

func getPods(kubeServiceToken string, kubeServiceBaseUrl string) (*GetPodsResponse, error) {
	url := fmt.Sprintf("%s/api/v1/namespaces/default/pods", kubeServiceBaseUrl)
	client := getHttpClient()
	req, err := http.NewRequest("GET", url, nil)
	if len(kubeServiceToken) > 0 {
		req.Header.Add("Authorization", "Bearer " + kubeServiceToken)
	}
	resp, err := client.Do(req)
	if err != nil {
		log.Println("Error getting pods: ", err)
		return nil, err
	} else {
		var getPodsResponse GetPodsResponse
		err := json.NewDecoder(resp.Body).Decode(&getPodsResponse)
		if err != nil {
			return nil, err
		} else if getPodsResponse.Kind != "PodList" {
			return nil, nil
		} else {
			return &getPodsResponse, nil
		}
	}
}

func getPodName(label string, kubeServiceToken string, kubeServiceBaseUrl string) (string, error) {
	log.Printf("Getting pod name for label '%s'...\n", label)
	getPodsResponse, err := getPods(kubeServiceToken, kubeServiceBaseUrl)
	if err != nil {
		return "", err
	} else {
		if getPodsResponse.Items != nil && len(getPodsResponse.Items) > 0 {
			for _, element := range getPodsResponse.Items {
				if element.Metadata != nil && element.Metadata.Labels != nil && element.Metadata.Labels.App == label {
					log.Printf("Pod name for label '%s' = '%s'\n", label, element.Metadata.Name)
					return element.Metadata.Name, nil
				}
			}
		}
		return "", nil
	}
}

func deletePod(label string, kubeServiceToken string, kubeServiceBaseUrl string) (bool, error) {
	log.Printf("Deleting pod for label '%s'...\n", label)
	name, err := getPodName(label, kubeServiceToken, kubeServiceBaseUrl)
	if err != nil {
		log.Println("Error deleting pod: ", err)
		return false, err
	} else if name == "" {
		return false, nil
	}
	// delete pod
	log.Printf("Deleting pod '%s'...\n", name)
	url := fmt.Sprintf("%s/api/v1/namespaces/default/pods/%s", kubeServiceBaseUrl, name)
	client := getHttpClient()
	req, err := http.NewRequest("DELETE", url, nil)
	if len(kubeServiceToken) > 0 {
		req.Header.Add("Authorization", "Bearer " + kubeServiceToken)
	}
	resp, err := client.Do(req)
	if err != nil {
		log.Println("Error deleting pod: ", err)
		return false, err
	} else {
		var deletePodResp DeletePodResponse
		err := json.NewDecoder(resp.Body).Decode(&deletePodResp)
		if err != nil {
			return false, err
		} else {
			return deletePodResp.Kind == "Pod", nil
		}
	}
}

func waitForPodTermination(label string, kubeServiceToken string, kubeServiceBaseUrl string) (bool, error) {
	log.Printf("Waiting for pod termination for label '%s'...\n", label)
	i := 0
	for i < 6 {
		i++
		time.Sleep(5 *time.Second)
		name, err := getPodName(label, kubeServiceToken, kubeServiceBaseUrl)
		if err != nil {
			log.Println("Error waiting for pod termination: ", err)
			return false, err
		} else if name == "" {
			return true, nil
		}
	}
	return false, nil
}

func getService(name string, kubeServiceToken string, kubeServiceBaseUrl string) (*GetServiceResponse, error) {
	url := fmt.Sprintf("%s/api/v1/namespaces/default/services/%s", kubeServiceBaseUrl, name)
	client := getHttpClient()
	req, err := http.NewRequest("GET", url, nil)
	if len(kubeServiceToken) > 0 {
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
	client := getHttpClient()
	req, err := http.NewRequest("POST", url, strings.NewReader(yaml))
	req.Header.Add("Content-Type", "application/yaml")
	if len(kubeServiceToken) > 0 {
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
			return nil, errors.New("Unable to create service: " + saveServiceResp.Kind)
		} else {
			return &saveServiceResp, nil
		}
	}
}

func deleteService(name string, kubeServiceToken string, kubeServiceBaseUrl string) (bool, error) {
	log.Printf("Deleting service '%s'...\n", name)
	url := fmt.Sprintf("%s/api/v1/namespaces/default/services/%s", kubeServiceBaseUrl, name)
	client := getHttpClient()
	req, err := http.NewRequest("DELETE", url, nil)
	if len(kubeServiceToken) > 0 {
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

func deleteExample(userId string, kubeServiceToken string, kubeServiceBaseUrl string) {
	log.Printf("Deleting example for user '%s'...\n", userId)
	deploymentName := getDeploymentName(userId)
	appLabel := getAppLabel(userId)
	serviceName := getServiceName(userId)
	_, _ = deleteDeployment(deploymentName, kubeServiceToken, kubeServiceBaseUrl)
	_, _ = deleteReplicaSet(appLabel, kubeServiceToken, kubeServiceBaseUrl)
	//_, _ = deletePod(appLabel, kubeServiceToken, kubeServiceBaseUrl)
	_, _ = deleteService(serviceName, kubeServiceToken, kubeServiceBaseUrl)
	_, _ = waitForPodTermination(appLabel, kubeServiceToken, kubeServiceBaseUrl)
}

func deployExample(userId string, gitRepo string, pvTemplate string, pvcTemplate string, deploymentTemplate string, serviceTemplate string, kubeServiceToken string, kubeServiceBaseUrl string) (*DeploymentDetails, error) {
	// delete example, if it exists
	deleteExample(userId, kubeServiceToken, kubeServiceBaseUrl)
	// download docker-compose yaml
	dockerComposePorts := []int{}
	dockerComposePaths := make(map[string]string)
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
					getDockerComposePaths(v, &dockerComposePaths, k.(string))
				}
			}
		}
	}
	// create persistent volume if not exits
	pvName := getPersistentVolumeName(userId)
	pvPath := getPersistentVolumePath(userId)
	pvResponse, err := getPersistentVolume(pvName, kubeServiceToken, kubeServiceBaseUrl)
	if err != nil {
		log.Println("Error saving persistent volume: ", err)
		return nil, err
	} else if pvResponse == nil {
		pv := pvTemplate
		pv = strings.Replace(pv, VAR_PV_NAME, pvName, -1)
		pv = strings.Replace(pv, VAR_PV_PATH, pvPath, -1)
		log.Println(pv)
		_, err = savePersistentVolume(pv, kubeServiceToken, kubeServiceBaseUrl)
		if err != nil {
			log.Println("Error saving persistent volume: ", err)
			return nil, err
		}
	}
	// create persistent volume claim, if not exists
	pvcName := getPersistentVolumeClaimName(userId)
	pvcResponse, err := getPersistentVolumeClaim(pvcName, kubeServiceToken, kubeServiceBaseUrl)
	if err != nil {
		log.Println("Error saving persistent volume claim: ", err)
		return nil, err
	} else if pvcResponse == nil {
		pvc := pvcTemplate
		pvc = strings.Replace(pvc, VAR_PVC_NAME, pvcName, -1)
		_, err = savePersistentVolumeClaim(pvc, kubeServiceToken, kubeServiceBaseUrl)
		if err != nil {
			log.Println("Error saving persistent volume claim: ", err)
			return nil, err
		}
	}
	// create deployment
	appLabel := getAppLabel(userId)
	deploymentName := getDeploymentName(userId)
	deployment := deploymentTemplate
	deployment = strings.Replace(deployment, VAR_DEPLOYMENT_NAME, deploymentName, -1)
	deployment = strings.Replace(deployment, VAR_APP_LABEL, appLabel, -1)
	deployment = strings.Replace(deployment, VAR_LOG_PORT, DEFAULT_LOG_PORT, -1)
	deployment = strings.Replace(deployment, VAR_EDITOR_PORT, DEFAULT_EDITOR_PORT, -1)
	deployment = strings.Replace(deployment, VAR_PROXY_PORT, DEFAULT_PROXY_PORT, -1)
	deployment = strings.Replace(deployment, VAR_GIT_REPO, gitRepo, -1)
	deployment = strings.Replace(deployment, VAR_PVC_NAME, pvcName, -1)
	_, err = saveDeployment(deployment, kubeServiceToken, kubeServiceBaseUrl)
	if err != nil {
		log.Println("Error saving deployment: ", err)
		return nil, err
	}
	// deployment created, now create the service
	serviceName := getServiceName(userId)
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
			path := dockerComposePaths[strconv.Itoa(element)]
			details.DockerComposeUrls = append(details.DockerComposeUrls, fmt.Sprintf("http://%d.%s:%d%s",element,details.NodeHostName,details.ProxyPort,path))
		}
		return details, nil
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

func getDockerComposePaths(v interface{}, paths *map[string]string, parent string) {
	typ := reflect.TypeOf(v).Kind()
	if typ == reflect.String {
		if parent == "labels" {
			str := v.(string)
			key := "com.exampleup.proxy.path."
			if strings.Contains(str, key) {
				str = strings.TrimPrefix(str, key)
				strs := strings.SplitN(str, ":", 2)
				portStr := strs[0]
				pathStr := strs[1]
				(*paths)[portStr] = pathStr
			}
		}
	} else if typ == reflect.Slice {
		getDockerComposePathsSlice(v.([]interface{}), paths, parent)
	} else if typ == reflect.Map {
		getDockerComposePathsMap(v.(map[interface{}]interface{}), paths)
	}
}

func getDockerComposePathsMap(m map[interface{}]interface{}, paths *map[string]string) {
	for k, v := range m {
		getDockerComposePaths(v, paths, strings.ToLower(k.(string)))
	}
}

func getDockerComposePathsSlice(slc []interface{}, paths *map[string]string, parent string) {
	for _, v := range slc {
		getDockerComposePaths(v, paths, parent)
	}
}

func getPersistentVolumeName(userId string) string {
	return strings.ToLower(fmt.Sprintf("u-%s-pv", userId))
}

func getPersistentVolumePath(userId string) string {
	return strings.ToLower(fmt.Sprintf("/u-%s-docker", userId))
}

func getPersistentVolumeClaimName(userId string) string {
	return strings.ToLower(fmt.Sprintf("u-%s-pvc", userId))
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