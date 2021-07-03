class Product(object):
    def __init__(self,name,price,briefdes="",description=""):
        self.name = name
        self.price = price
        self.briefdes = briefdes
        self.description = description
    def json(self):
        return {"name":self.name,"price":self.price,"briefdes":self.briefdes,"description":self.description}

class Category(object):
    def __init__(self,name,products=[]):
        self.name = name
        self.products = products
    def json(self):
        return {"name":self.name,"products":self.products}
class User(object):
    def __init__(self,email,password,id=0):
        self.email = email
        self.password = password
        self.hash = self.__hash__()
    def json(self):
        return {"email":self.email,"password":self.password}
    def __hash__(self):
        return hash((self.email, self.password))