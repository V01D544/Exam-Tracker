from bs4 import BeautifulSoup
import requests
import json
import sys

temp=input()
temp2=json.loads(temp)

url=json.loads(temp2)

response=requests.get(url)
htmlContent=response.content
soup=BeautifulSoup(htmlContent,'html.parser')

tempAllPara=soup.find_all('p')

allText=[]
for para in tempAllPara:
    allText.append(str(para.text))
allPara2=json.dumps(allText)
allPara=json.dumps(allPara2)


print(allPara);
