from os.path import isfile, join
from mimetypes import MimeTypes
from os import listdir
import hashlib
import time
import hmac
import copy
import sys
import os


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
    def __repr__(self):
        return f'User({self.email}, {self.password})'
    def __hash__(self):
        return hash((self.email, self.password))


class File(object):

    defaultUploadOptions = {
        "fieldname": "file",
        "validation": {
            "allowedExts": ["txt", "pdf", "doc"],
            "allowedMimeTypes": ["text/plain", "application/msword", "application/x-pdf", "application/pdf"]
        }
    }

    @staticmethod
    def upload(req, fileRoute, options = None):
        """
        File upload to disk.
        Parameters:
            req: framework adapter to http request. See BaseAdapter.
            fileRoute: string
            options: dict optional, see defaultUploadOptions attribute
        Return:
            dict: {link: "linkPath"}
        """

        if options is None:
            options = File.defaultUploadOptions
        else:
            options = Utils.merge_dicts(File.defaultUploadOptions, options)

        # Get extension.
        filename = req.getFilename(options["fieldname"]);
        extension = Utils.getExtension(filename)
        extension = "." + extension if extension else ""

        # Generate new random name.

        # python 2-3 compatible:
        try:
            sha1 = hashlib.sha1(str(time.time()).encode("utf-8")).hexdigest() #  v3
        except Exception:
            sha1 = hashlib.sha1(str(time.time())).hexdigest() # v2
        routeFilename = fileRoute + sha1 + extension

        fullNamePath = Utils.getServerPath() + routeFilename

        req.saveFile(options["fieldname"], fullNamePath)

        # Check validation.
        if "validation" in options:
            if not Utils.isValid(options["validation"], fullNamePath, req.getMimetype(options["fieldname"])):
                File.delete(routeFilename)
                raise Exception("File does not meet the validation.")

        if "resize" in options and options["resize"] is not None:
            with Image(filename = fullNamePath) as img:
                img.transform(resize = options["resize"])
                img.save(filename = fullNamePath)

        # build and send response.
        response = {}
        response["link"] = routeFilename
        return response

    @staticmethod
    def delete(src):
        """
        Delete file from disk.
        Parameters:
            src: string
        """

        filePath = Utils.getServerPath() + src
        try:
            os.remove(filePath)
        except OSError:
            pass

class Utils(object):
   """
   Utils static class.
   """

   @staticmethod
   def hmac(key, string, hex = False):
       """
       Calculate hmac.
       Parameters:
           key: string
           string: string
           hex: boolean optional, return in hex, else return in binary
       Return:
           string: hmax in hex or binary
       """

       # python 2-3 compatible:
       try:
           hmac256 = hmac.new(key.encode() if isinstance(key, str) else key, msg = string.encode("utf-8") if isinstance(string, str) else string, digestmod = hashlib.sha256) # v3
       except Exception:
           hmac256 = hmac.new(key, msg=string, digestmod = hashlib.sha256) # v2

       return hmac256.hexdigest() if hex else hmac256.digest()

   @staticmethod
   def merge_dicts(a, b, path = None):
       """
       Deep merge two dicts without modifying them. Source: http://stackoverflow.com/questions/7204805/dictionaries-of-dictionaries-merge/7205107#7205107
       Parameters:
           a: dict
           b: dict
           path: list
       Return:
           dict: Deep merged dict.
       """

       aClone = copy.deepcopy(a);
       # Returns deep b into a without affecting the sources.
       if path is None: path = []
       for key in b:
           if key in a:
               if isinstance(a[key], dict) and isinstance(b[key], dict):
                   aClone[key] = Utils.merge_dicts(a[key], b[key], path + [str(key)])
               else:
                   aClone[key] = b[key]
           else:
               aClone[key] = b[key]
       return aClone

   @staticmethod
   def getExtension(filename):
       """
       Get filename extension.
       Parameters:
           filename: string
       Return:
           string: The extension without the dot.
       """
       return os.path.splitext(filename)[1][1:]

   @staticmethod
   def getServerPath():
       """
       Get the path where the server has started.
       Return:
           string: serverPath
       """
       return os.path.abspath(os.path.dirname(sys.argv[0]))

   @staticmethod
   def isFileValid(filename, mimetype, allowedExts, allowedMimeTypes):
       """
       Test if a file is valid based on its extension and mime type.
       Parameters:
           filename string
           mimeType string
           allowedExts list
           allowedMimeTypes list
       Return:
           boolean
       """

       # Skip if the allowed extensions or mime types are missing.
       if not allowedExts or not allowedMimeTypes:
           return False

       extension = Utils.getExtension(filename)
       return extension.lower() in allowedExts and mimetype in allowedMimeTypes

   @staticmethod
   def isValid(validation, filePath, mimetype):
       """
       Generic file validation.
       Parameters:
           validation: dict or function
           filePath: string
           mimetype: string
       """

       # No validation means you dont want to validate, so return affirmative.
       if not validation:
           return True

       # Validation is a function provided by the user.
       if callable(validation):
           return validation(filePath, mimetype)

       if isinstance(validation, dict):
           return Utils.isFileValid(filePath, mimetype, validation["allowedExts"], validation["allowedMimeTypes"])

       # Else: no specific validating behaviour found.
       return False


class BaseAdapter(object):
   """
   Interface. Inherit this class to use the lib in your framework.
   """

   def __init__(self, request):
       """
       Constructor.
       Parameters:
           request: http request object from some framework.
       """
       self.request = request

   def riseError(self):
       """
       Use this when you want to make an abstract method.
       """
       raise NotImplementedError( "Should have implemented this method." )

   def getFilename(self, fieldname):
       """
       Get upload filename based on the fieldname.
       Parameters:
           fieldname: string
       Return:
           string: filename
       """
       self.riseError()

   def getMimetype(self, fieldname):
       """
       Get upload file mime type based on the fieldname.
       Parameters:
           fieldname: string
       Return:
           string: mimetype
       """
       self.riseError()

   def saveFile(self, fieldname, fullNamePath):
       """
       Save the upload file based on the fieldname on the fullNamePath location.
       Parameters:
           fieldname: string
           fullNamePath: string
       """
       self.riseError()


class FlaskAdapter(BaseAdapter):
   """
   Flask Adapter: Check BaseAdapter to see what methods description.
   """

   def checkFile(self, fieldname):
       if fieldname not in self.request.files:
           raise Exception("File does not exist.")

   def getFilename(self, fieldname):
       self.checkFile(fieldname)
       return self.request.files[fieldname].filename

   def getMimetype(self, fieldname):
       self.checkFile(fieldname)
       return self.request.files[fieldname].content_type

   def saveFile(self, fieldname, fullNamePath):
       self.checkFile(fieldname)
       file = self.request.files[fieldname]
       file.save(fullNamePath)