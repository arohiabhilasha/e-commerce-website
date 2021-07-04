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
    '''
    The base User object.
    '''
    def __init__(self,email,password,name,dob:str,id=0):
        self.email = email
        self.password = password
        self.name = name
        self.dob = dob
        self.hash = self.__hash__()
    def json(self):
        '''
        Returns the json-serializable dict of the object.
        '''
        return {"name":self.name,"dob":self.dob,"email":self.email,"password":self.password}
    def __hash__(self):
        return hash((self.email, self.password))