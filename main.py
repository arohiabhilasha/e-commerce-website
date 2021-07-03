from flask import Flask, render_template, request, redirect, make_response
from random import randint
from classes import Product
import pickledb as dbms

proddb = dbms.load("products.json",True)

app = Flask("ECom App Fuddu Edition", template_folder="G:\\e-commerce_website\\",static_folder="/",static_url_path="/")

@app.route('/')
def home():
    return render_template("main.html")

@app.route('/cart')
def cart():
    return render_template("cart.html")

@app.route('/prod')
def prods():
    return render_template("products.html")

@app.route('/product')
def prod():
    prods = [
        {'prod_name':'BroBook','subhead':'Barney Stinson','briefdes':'This is the legendary playbook','description':'This is the great book everyone wants!'},
        {'prod_name':'BroBook 2','subhead':'Barney Stinson','briefdes':'This is the legendary playbook','description':'This is the great book everyone wants!'},
        {'prod_name':'BroBook 3','subhead':'Barney Stinson','briefdes':'This is the legendary playbook','description':'This is the great book everyone wants!'}
    ]
    prod = prods[randint(0,2)]
    return render_template("single_pro.html", prod_name=prod['prod_name'], subhead=prod['subhead'], briefdes=prod['briefdes'], description=prod['description'])

@app.route('/processLogin',methods=['GET','POST'])
def processLogin():
    resp = make_response(redirect('/acc'))
    resp.set_cookie('isLoggedIn', "true")
    resp.set_cookie('secretCookie',"true")
    return resp

@app.route('/login')
def login():
    return render_template("login.html")

@app.route('/signup')
def signup():
    return render_template("signup.html")

@app.route('/acc')
def account():
    if request.cookies.get('isLoggedIn') and request.cookies.get('secretCookie'):
        return render_template('acc.html')
    else:
        return redirect('/login')

@app.route('/html/<name>')
def catchall(name):
    try:
        return render_template(f"{name}.html")
    except:
        return '404 Not Found'

@app.route('/addtocart',methods=['GET'])
def addtocart():
    pass
app.run('0.0.0.0',5000, debug=True)
