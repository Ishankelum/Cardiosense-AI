import sys
sys.path.insert(0, r"D:\py_packages")
import joblib, pandas as pd, numpy as np
from sklearn.metrics import accuracy_score, classification_report, roc_auc_score, confusion_matrix
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler

model  = joblib.load("model/heart_disease_model.pkl")
scaler = joblib.load("model/scaler.pkl")

def load_uci(f):
    df = pd.read_csv(f)
    df["sex"] = (df["sex"]=="Male").astype(int)
    df["cp"] = df["cp"].map({"typical angina":1,"atypical angina":2,"non-anginal":3,"asymptomatic":4}).fillna(2)
    df["fbs"] = df["fbs"].map({True:1,False:0,"TRUE":1,"FALSE":0}).fillna(0)
    df["restecg"] = df["restecg"].map({"normal":0,"st-t abnormality":1,"lv hypertrophy":2}).fillna(0)
    df["exang"] = df["exang"].map({True:1,False:0,"TRUE":1,"FALSE":0}).fillna(0)
    df["slope"] = df["slope"].map({"upsloping":1,"flat":2,"downsloping":3}).fillna(1)
    df["thal"] = df["thal"].map({"normal":1,"fixed defect":2,"reversable defect":3}).fillna(2)
    df["target"] = (df["num"]>0).astype(int)
    cols=["age","sex","cp","trestbps","chol","fbs","restecg","thalch","exang","oldpeak","slope","ca","thal","target"]
    return df[cols].copy().rename(columns={"thalch":"thalach"}).dropna()

def load_statlog(f):
    df=pd.read_csv(f); df.columns=df.columns.str.strip()
    df=df.rename(columns={"chest pain type":"cp","resting bp s":"trestbps","cholesterol":"chol",
        "fasting blood sugar":"fbs","resting ecg":"restecg","max heart rate":"thalach",
        "exercise angina":"exang","ST slope":"slope"})
    df["ca"]=0.0; df["thal"]=2.0
    cols=["age","sex","cp","trestbps","chol","fbs","restecg","thalach","exang","oldpeak","slope","ca","thal","target"]
    return df[cols].dropna()

df = pd.concat([load_uci("data/heart_disease_uci.csv"), load_statlog("data/heart_statlog_cleveland_hungary_final.csv")], ignore_index=True)
FEATURES=["age","sex","cp","trestbps","chol","fbs","restecg","thalach","exang","oldpeak","slope","ca","thal"]
X = df[FEATURES].astype(float); y = df["target"]

X_tr,X_te,y_tr,y_te = train_test_split(X,y,test_size=0.2,random_state=42,stratify=y)
X_tr_s = scaler.fit_transform(X_tr); X_te_s = scaler.transform(X_te)

y_pred = model.predict(X_te_s)
y_prob = model.predict_proba(X_te_s)[:,1]

acc  = accuracy_score(y_te, y_pred)
auc  = roc_auc_score(y_te, y_prob)
cm   = confusion_matrix(y_te, y_pred)
tn,fp,fn,tp = cm.ravel()
sensitivity = tp/(tp+fn)
specificity = tn/(tn+fp)
precision   = tp/(tp+fp)
f1 = 2*precision*sensitivity/(precision+sensitivity)

cv_scores = cross_val_score(model, scaler.transform(X), y, cv=5, scoring="accuracy")

print("=== MODEL ACCURACY REPORT ===")
print()
print("Dataset:")
print("  Total samples  :", len(df))
print("  Disease cases  :", int(y.sum()), "("+str(round(y.mean()*100,1))+"%)")
print("  Healthy cases  :", int((y==0).sum()), "("+str(round((1-y.mean())*100,1))+"%)")
print()
print("Test Set Results (20% holdout):")
print("  Test samples   :", len(y_te))
print("  Accuracy       :", round(acc*100,2), "%")
print("  ROC-AUC Score  :", round(auc,4))
print("  Sensitivity    :", round(sensitivity*100,2), "% (caught real disease cases)")
print("  Specificity    :", round(specificity*100,2), "% (correctly cleared healthy patients)")
print("  Precision      :", round(precision*100,2), "%")
print("  F1 Score       :", round(f1,4))
print()
print("Confusion Matrix:")
print("  True Positive  :", tp, "(disease correctly detected)")
print("  True Negative  :", tn, "(healthy correctly cleared)")
print("  False Positive :", fp, "(healthy flagged as disease)")
print("  False Negative :", fn, "(disease MISSED - most dangerous)")
print()
print("5-Fold Cross Validation:")
print("  Scores         :", [round(s*100,1) for s in cv_scores], "%")
print("  Mean CV Acc    :", round(cv_scores.mean()*100,2), "%")
print("  Std Dev        :", round(cv_scores.std()*100,2), "%")
print()
print(classification_report(y_te, y_pred, target_names=["No Disease","Disease"]))
