# GIStis-League
Open Project, Spring 2026

IMPORTANT: 
DO NOT make any direct pushes to main. Only make pushes to your own branch. 

To do a task, follow these steps:
1. Retrieve the main code locally & create a new branch for your work
```bash
git checkout main
git pull
git checkout -b <YOUR_BRANCH_NAME>
```
2. Code up your feature/changes
3. Save & push your changes onto Github (this will keep your changes in your own branch)
```bash
git add .
git commit -m "<YOUR_COMMIT_MESSAGE_HERE"
git push origin <YOUR_BRANCH_NAME>
```
4. If you're running issues with your username/password in #3, make a token by going to Github (click on your profile avatar) > Settings > Developer settings > Personal access tokens > Tokens (classic). Then, click on "Generate new token", select "Generate new token (classic), name your token whatever you want, select 90 days expiration, select the "repo" checkbox, and click generate token. After you have generated the token, use your token ID as the password instead of your normal password inside terminal (your username stays the same). 
5. Go to pull requests in github
6. Select "New Pull Request"
7. Select the main branch and your branch (the branch with <YOUR_NAME_HERE>)
8. Create the new pull request
9. Let David and Emily know
10. The PR (pull request) will be verified/denied by David and Emily. 

To set up your repository intially (ONLY DO THIS ONCE): 
```bash
git clone https://github.com/davidzhangberkeley/GIStis-League.git
```

To set up the anaConda environment on VSCode (ONLY DO THIS ONCE):
1. install anaconda through https://www.anaconda.com/docs/getting-started/anaconda/install#macos-linux-installation
2. Inside your terminal, CD (change directory) until you're in the project folder (gistis-league)
3. run ```conda env create -f environment.yml```
4. open the project directory on VSCode
5. press CMD + Shift + P
6. navigate to "Select Python Interpreter" and select Python 3.11.14 (gistis)

HOMEWORK 1 ATTENDANCE (add your name here and make the pull request):
David 
Eva 
Enguun
Ojasvi Shrivastava
