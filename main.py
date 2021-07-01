from flask import Flask, render_template, request
from random import randint

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

@app.route('/html/<name>')
def catchall(name):
    try:
        return render_template(f"{name}.html")
    except:
        return '404 Not Found'
app.run('0.0.0.0',5000, debug=True)
