from bs4 import BeautifulSoup
import requests
from urllib.parse import urljoin

import json
import sys

temp=input()
temp2=json.loads(temp)

examObjectArray=json.loads(temp2)

allExamDetails=[]
for exam in examObjectArray:

    examNameArray=list(exam)  # gives key
    examName=examNameArray[0]

    examLinks=list(exam.get(examName))
     
    particularExamDetails={}
    admitCard=[]
    result=[]
    syllabus=[]
    register=[]
    for link in examLinks:
        
        if link!='':
             response=requests.get(link)
             htmlContent=response.content
             soup=BeautifulSoup(htmlContent,'html.parser')
             allAnchors=soup.find_all('a')
             for h in allAnchors:
                  check=str(h.string)
                  if  "ADMIT" in check or "Admit" in check or "admit" in check :
                     base=h.get('href')
                     if "http" not in base:
                         h['href']=urljoin(link,base)                           
                     admitCard.append(str(h))
                  if  "RESULT" in check or "Result" in check or "result" in check or "Score Card" in check :
                     base=h.get('href')
                     if "http" not in base:
                         h['href']=urljoin(link,base)
                     result.append(str(h))
                  if  "SYLLABUS" in check or "Syllabus" in check or "syllabus" in check :
                     base=h.get('href')
                     if "http" not in base:
                         h['href']=urljoin(link,base)
                     syllabus.append(str(h)) 
                  if  "REGISTER" in check or "Register" in check or "register" in check :
                     base=h.get('href')
                     if "http" not in base:
                         h['href']=urljoin(link,base)
                     register.append(str(h))     
 
        
    particularExamDetails[examName]={"AdmitCard":admitCard,"Result":result,"Syllabus":syllabus,"Register":register}
        
    allExamDetails.append(particularExamDetails)

a=json.dumps(allExamDetails) 
b=json.dumps(a)
print(b) 
